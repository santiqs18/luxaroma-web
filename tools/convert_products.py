#!/usr/bin/env python3
"""Convierte el JSON limpio del proveedor (Downloads/productos_clean.json) al
esquema del catálogo (data/products.json).

- Filtra SOLO perfumes (PERFUMES ARABES + PERFUMES DE DISEÑADOR).
- Elimina emojis residuales y normaliza nombres.
- Infiere marca, género, concentración (EDP/EDT/...) y tamaño (ml) del nombre.
- Conserva la imagen remota del proveedor (CDN) para no duplicar cientos de
  imágenes localmente; los 2 casos sin foto caen al placeholder del sitio.
- Precio en ARS redondeado. available=true (venta por encargo).
- Deduplicación por (marca, nombre, tamaño) quedándose con el precio menor.
- id = perfume-0001..N (estable y corto para URLs).

Uso:
    python tools/convert_products.py
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(r"C:\Users\Santiago Quiroga\Downloads\productos_clean.json")
OUT = ROOT / "data" / "products.json"

PERFUME_CATEGORIES = {"PERFUMES ARABES", "PERFUMES DE DISEÑADOR"}

# Margen de venta sobre el precio del proveedor (ARS). 1.35 = +35%.
PRICE_MARKUP = 1.35

BRANDS = [
    "AGATHA RUIZ DE LA PRADA", "ANTONIO BANDERAS", "BANANA REPUBLIC",
    "BATH & BODY WORKS", "BOTTEGA VENETA", "CAROLINA HERRERA",
    "CHRISTIAN DIOR", "DOLCE & GABBANA", "ELIZABETH ARDEN",
    "GIORGIO ARMANI", "JEAN PAUL GAULTIER", "JO MALONE",
    "MARC JACOBS", "PACO RABANNE", "RALPH LAUREN", "ROBERTO CAVALLI",
    "TOM FORD", "VIKTOR & ROLF", "YVES SAINT LAURENT",
    "AGATHA", "ARMAF", "ARMANI", "ARQUS", "ASSALA", "AURORA", "AXIS",
    "AZZARO", "BALENCIAGA", "BALDESSARINI", "BEAUTIK", "BENETTON",
    "BENTLEY", "BDK", "BHARARA", "BLUMARINE", "BOGART", "BOND",
    "BOTTEGA", "BOUCHERON", "BURBERRY", "CALVIN", "CHANEL",
    "CHLOE", "CLINIQUE", "COACH", "DAVIDOFF", "DIOR", "DOLCE",
    "DUNHILL", "ELIE SAAB", "EMPORIO ARMANI", "FERRARI", "GIANNI",
    "GUCCI", "GUERLAIN", "HERMES", "HUGO", "ISSEY", "JACQUES",
    "JIMMY", "KENNETH", "LALIQUE", "LATTAFA", "MAISON ALHAMBRA",
    "MARCELO", "MICHAEL", "MOSCHINO", "NARCISO", "NINA", "NINA RICCI",
    "OSCAR", "PINK", "RASASI", "REVLON", "RIFFS", "SAUVAGE",
    "SAUVAGE ELIXIR", "TOUS", "AL HARAMAIN", "AFNAN", "VICTORIA'S SECRET",
]
BRANDS.sort(key=len, reverse=True)

CONCENTRATIONS = [
    ("EAU DE PARFUM INTENSE", "Eau de Parfum Intense"),
    ("EAU DE PARFUM", "Eau de Parfum"),
    ("EAU DE TOILETTE", "Eau de Toilette"),
    ("EAU DE COLOGNE", "Eau de Cologne"),
    ("EAU DE COLAGNE", "Eau de Cologne"),
    ("EAU FRAICHE", "Eau Fraîche"),
    ("BODY SPLASH", "Body Splash"),
    ("BODY SPRAY", "Body Spray"),
    ("PARFUM", "Parfum"),
    ("ELIXIR", "Elixir"),
    ("EXTRAIT", "Extrait de Parfum"),
    ("COLOGNE", "Eau de Cologne"),
    ("EDP", "Eau de Parfum"),
    ("EDT", "Eau de Toilette"),
    ("EDC", "Eau de Cologne"),
]

EMOJI_RE = re.compile(
    r"[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF"
    r"\u2700-\u27BF\u2190-\u21FF\u2B00-\u2BFF]\s*"
)

GENDER_WORDS = {
    "M": "hombre", "MASCULINO": "hombre", "HOMBRE": "hombre",
    "HOMME": "hombre", "UOMO": "hombre", "FOR MEN": "hombre",
    "POUR HOMME": "hombre", "MEN": "hombre",
    "F": "mujer", "FEMENINO": "mujer", "MUJER": "mujer",
    "FEMME": "mujer", "DONNA": "mujer", "FOR HER": "mujer",
    "POUR FEMME": "mujer", "WOMAN": "mujer", "WOMEN": "mujer",
    "LADY": "mujer",
}


def remove_emoji(text):
    return EMOJI_RE.sub("", text or "").strip()


def title_case(tokens):
    minor = {"de", "la", "del", "di", "do", "le", "el", "&"}
    out = []
    for i, w in enumerate(tokens):
        low = w.lower()
        if low in minor and i != 0:
            out.append(low)
        elif low in {"for", "pour", "the"}:
            out.append(w.capitalize())
        else:
            out.append(low.capitalize())
    return " ".join(out)


# Tokens que nunca son marca si aparecen al inicio (concentración, tipo, etc.).
NON_BRAND_FIRST = set(
    key for key, _ in CONCENTRATIONS
) | {
    "BODY", "EAU", "EDP", "EDT", "EDC", "PARFUM", "PERFUME", "SPRAY",
    "MIST", "DEO", "DEODORANTE", "COLONIA", "COLOGNE",
    "SPLASH", "SHOWER", "GEL", "MILK", "LOTION", "CREAM", "OIL",
    "SOAP", "INTENSE",
}


def infer_brand(name):
    up = " " + remove_emoji(name).strip().upper() + " "
    # 1) Marca conocida en cualquier parte de la frase (la más larga gana).
    for b in BRANDS:  # ya ordenadas de más larga a más corta
        if re.search(r"\b" + re.escape(b) + r"\b", up):
            return b
    # 2) Sin marca reconocida: primera palabra que no sea token espurio.
    tokens = remove_emoji(name).strip().split(" ")
    for tok in tokens:
        t = tok.upper()
        if t and t not in NON_BRAND_FIRST and t not in GENDER_WORDS and not re.fullmatch(r"\d+[A-Z]*", t):
            return t
    return ""


def pretty_brand(value):
    return " ".join(w[:1].upper() + w[1:].lower() for w in value.split() if w)


def infer_gender(name):
    up = " " + remove_emoji(name).upper() + " "
    resultado = None
    for word, gender in GENDER_WORDS.items():
        if re.search(r"\b" + re.escape(word) + r"\b", up):
            if resultado and resultado != gender:
                return "unisex"
            resultado = gender
    return resultado or "unisex"


def infer_concentration(name):
    up = " " + remove_emoji(name).upper() + " "
    for key, label in CONCENTRATIONS:
        if re.search(r"\b" + re.escape(key) + r"\b", up):
            return label
    return ""


def infer_size(name):
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:ML|MLS)", remove_emoji(name).upper())
    if m:
        return f"{m.group(1).replace('.', ',')} ml"
    return ""


def clean_name(name, brand, size):
    up = " " + remove_emoji(name).upper() + " "
    if brand and brand.upper() in up:
        up = up.replace(brand.upper(), " ")
    for raw_key, _ in CONCENTRATIONS:
        up = re.sub(r"\b" + re.escape(raw_key) + r"\b", " ", up)
    up = re.sub(r"\d+(?:[.,]\d+)?\s*(?:ML|MLS)", " ", up)
    for word in GENDER_WORDS:
        up = re.sub(r"\b" + re.escape(word) + r"\b", " ", up)
    tokens = [t for t in up.split() if t and not t.isdigit()]
    result = title_case(tokens).strip()
    return result or remove_emoji(name).strip()


def clean_description(raw, name):
    text = remove_emoji(raw or "")
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    boiler = any(
        "100% original" in ln.lower()
        or "consult" in ln.lower()
        or "whatsapp" in ln.lower()
        for ln in lines
    )
    if boiler or not text:
        return (
            f"{name}. Producto 100% original e importado, nuevo en su empaque. "
            "Consultá disponibilidad y envío por WhatsApp."
        )
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_price(value):
    try:
        return round(float(value) * PRICE_MARKUP)
    except (TypeError, ValueError):
        return None


def first_image(item):
    img = item.get("imagen") or ""
    if isinstance(img, str) and img.strip():
        return img.strip()
    imgs = item.get("imagenes")
    if isinstance(imgs, list) and imgs:
        first = imgs[0]
        if isinstance(first, str) and first.strip():
            return first.strip()
    return ""


def convert():
    with open(SRC, encoding="utf-8") as fh:
        raw = json.load(fh)

    items = []
    skipped = {}

    for p in raw:
        cat = p.get("categoria", "")
        if cat not in PERFUME_CATEGORIES:
            skipped[cat] = skipped.get(cat, 0) + 1
            continue

        name = remove_emoji(p.get("nombre", "")).strip()
        if not name:
            continue

        brand = infer_brand(name)
        gender = infer_gender(name)
        concentration = infer_concentration(name)
        size = infer_size(name)
        clean = clean_name(name, brand, size)

        items.append({
            "brand": brand.upper(),
            "name": clean,
            "size": size,
            "gender": gender,
            "concentration": concentration,
            "price": parse_price(p.get("precio_ars")),
            "image": first_image(p),
            "description": clean_description(p.get("descripcion", ""), clean),
        })

    # Dedupe exacto por marca+nombre+tamaño; se queda con el precio menor.
    def price_key(value):
        return value if value is not None else 10**18

    seen = {}
    unique = []
    for it in items:
        key = (it["brand"], it["name"].upper(), it["size"])
        prev = seen.get(key)
        if prev is None:
            seen[key] = len(unique)
            unique.append(it)
        elif price_key(it["price"]) < price_key(unique[prev]["price"]):
            unique[prev] = it

    out = []
    for n, it in enumerate(unique, 1):
        out.append({
            "id": f"perfume-{n:04d}",
            "name": it["name"],
            "brand": pretty_brand(it["brand"] or "Sin marca"),
            "gender": it["gender"],
            "category": it["concentration"],
            "family": "",
            "size": it["size"],
            "price": it["price"],
            "image": it["image"],
            "available": True,
            "description": it["description"],
            "notes": [],
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)

    print(json.dumps({
        "perfumes_entrada": len(items),
        "perfumes_finales": len(out),
        "duplicados_removidos": len(items) - len(out),
        "omitidos": skipped,
    }, ensure_ascii=False))


if __name__ == "__main__":
    convert()