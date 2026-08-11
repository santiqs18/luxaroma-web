#!/usr/bin/env python3
"""Recalcula los precios del catálogo con una estrategia de margen dinámico.

Fuentes:
  - Costo del proveedor (NeoImport): data/neoimport_costs.json (snapshot de la
    tabla `productos` de Supabase, campo precio_ars). Se cruza por código
    (cod_atacado ELEGANCIA-XXXX / URL de imagen) y, si no hay, por nombre
    normalizado del producto.
    Para refrescar el snapshot: fetch_neoimport.py.
  - Referencia de mercado (MercadoLibre): data/market_prices.csv (ml_avg).

Estrategia (parámetros ajustables arriba):
  costo_flete  = costo * (1 + FLETE_PCT)              → +8% flete
  precio_obj   = costo_flete * (1 + MARGEN_OBJ)       → margen objetivo (+40%)
  precio_min   = costo_flete * (1 + MARGEN_MIN)       → piso de margen (+25%)
  tope_ml      = ml_avg * (1 - TOPE_ML_PCT)           → hasta 3% bajo el promedio ML

  Sin referencia ML : precio = precio_obj            (estado "objetivo")
  Con referencia ML : precio = min(precio_obj, tope_ml)
                      - si queda ≥ precio_min        → "cap"  (tope competitivo)
                        y es el puntual sin tope      → "ok"
                      - si margen 15-25%             → "fin"  (competitivo fino)
                      - si margen < 15%              → "proteg" (sube a precio_min)

  Sin costo/proveedor: se conserva el precio previo (estado "sin_costo").

  Redondeo: múltiplo de REDONDEO (50) hacia arriba.

Uso:
    python tools/pricing_neo.py              # aplica y escribe reporte
    python tools/pricing_neo.py --dry-run    # simula, no escribe nada
"""

import argparse
import csv
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROVIDER_FILE = ROOT / "data" / "neoimport_costs.json"
CATALOG_FILE = ROOT / "data" / "products.json"
MARKET_FILE = ROOT / "data" / "market_prices.csv"
REPORT_FILE = ROOT / "data" / "pricing_report.csv"

# ---- Parámetros de la estrategia -------------------------------------------------
MARGEN_OBJ = 0.40
MARGEN_MIN = 0.25
PISO_COMPETITIVO = 0.15
FLETE_PCT = 0.08
TOPE_ML_PCT = 0.03
REDONDEO = 50

PERFUME_CATEGORIES = {"PERFUMES ARABES", "PERFUMES DE DISEÑADOR"}


def codigo_de_url(url):
    m = re.search(r"/products/(\d+)_", url or "")
    return m.group(1) if m else ""


def normalizar(texto):
    t = (texto or "").lower()
    t = re.sub(r"(\d)\s*mls?\b", r"\1ml", t)
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def redondear(precio):
    return int(math.ceil(precio / REDONDEO) * REDONDEO)


def margen_pct(precio, costo_flete):
    return round((precio - costo_flete) / costo_flete * 100, 1) if costo_flete else None


def cargar_proveedor():
    """Mapas: codigo -> precio_ars y nombre_normalizado -> (precio_ars, codigo)."""
    with open(PROVIDER_FILE, encoding="utf-8") as fh:
        raw = json.load(fh)
    por_codigo, por_nombre = {}, {}
    for p in raw:
        if p.get("estado") != "Activo":
            continue
        precio = p.get("precio_ars")
        if precio is None:
            continue
        m = re.search(r"(\d+)\s*$", str(p.get("cod_atacado") or ""))
        codigo = m.group(1) if m else codigo_de_url(p.get("imagen") or "")
        if codigo:
            por_codigo[codigo] = precio
        clave = normalizar(p.get("nombre"))
        if clave and clave not in por_nombre:
            por_nombre[clave] = (precio, codigo)
    return por_codigo, por_nombre


def cargar_mercado():
    refs = {}
    with open(MARKET_FILE, encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            codigo = (row.get("code") or "").strip()
            try:
                ml_avg = float(row.get("ml_avg"))
            except (TypeError, ValueError):
                continue
            if codigo:
                refs[codigo] = ml_avg
    return refs


def decidir(costo, ml_avg):
    costo_flete = costo * (1 + FLETE_PCT)
    precio_obj = redondear(costo_flete * (1 + MARGEN_OBJ))
    precio_min = redondear(costo_flete * (1 + MARGEN_MIN))

    if ml_avg is None:
        return precio_obj, "objetivo", costo_flete

    tope = redondear(ml_avg * (1 - TOPE_ML_PCT))
    candidato = min(precio_obj, tope)
    margen = margen_pct(candidato, costo_flete)
    if candidato >= precio_min:
        estado = "ok" if candidato == precio_obj else "cap"
        return candidato, estado, costo_flete
    if margen is not None and margen >= PISO_COMPETITIVO * 100:
        return candidato, "fin", costo_flete
    return precio_min, "proteg", costo_flete


def precio_proveedor(por_codigo, por_nombre, producto):
    codigo = codigo_de_url(producto.get("image", ""))
    if codigo and codigo in por_codigo:
        return por_codigo[codigo], codigo
    clave = normalizar(
        f"{producto.get('brand', '')} {producto.get('name', '')} {producto.get('size', '')}"
    )
    hit = por_nombre.get(clave)
    if hit:
        return hit[0], hit[1] or codigo
    # fallback: coincidencia por contención de tokens (marca+nombre dentro del
    # nombre completo del proveedor), la de menos tokens extra gana.
    objetivo = set(clave.split())
    objetivo.discard("")
    candidatos = []
    for clave_p, (precio_p, codigo_p) in por_nombre.items():
        tokens_p = set(clave_p.split())
        if objetivo and objetivo.issubset(tokens_p):
            candidatos.append((len(tokens_p - objetivo), precio_p, codigo_p))
    if candidatos:
        _, precio_p, codigo_p = min(candidatos)
        return precio_p, codigo_p or codigo
    return None, codigo


def dump_catalogo(productos, path):
    """Reescribe products.json respetando el estilo actual del archivo
    (objetos con 4 espacios, `"key":  valor` con doble espacio y arrays
    vacíos expandidos), de modo que el diff sea mínimo."""
    partes = ["["]
    total = len(productos)
    for i, p in enumerate(productos):
        partes.append("    {")
        campos = len(p)
        for j, (k, v) in enumerate(p.items()):
            ultimo = j == campos - 1
            coma = "" if ultimo else ","
            if isinstance(v, list) and not v:
                encabezado = f'        "{k}":  ['
                partes.append(encabezado)
                partes.append("")
                partes.append(" " * len(encabezado) + "]" + coma)
            elif isinstance(v, bool):
                partes.append(f'        "{k}":  {str(v).lower()}{coma}')
            elif isinstance(v, str):
                partes.append(f'        "{k}":  {json.dumps(v, ensure_ascii=False)}{coma}')
            else:
                partes.append(f'        "{k}":  {v}{coma}')
        partes.append("    }," if i < total - 1 else "    }")
    partes.append("]")
    path.write_text("\n".join(partes), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    por_codigo, por_nombre = cargar_proveedor()
    mercado = cargar_mercado()
    with open(CATALOG_FILE, encoding="utf-8") as fh:
        catalogo = json.load(fh)

    filas, cambios, estados = [], {}, {}
    for p in catalogo:
        costo, codigo = precio_proveedor(por_codigo, por_nombre, p)
        previo = p.get("price")
        if costo is None:
            estado, nuevo, costo_flete = "sin_costo", previo, None
            ml_avg = None
        else:
            ml_avg = mercado.get(codigo) if codigo else None
            nuevo, estado, costo_flete = decidir(costo, ml_avg)
            if previo is not None:
                p["price"] = nuevo

        filas.append({
            "id": p["id"], "nombre": p["name"], "marca": p["brand"],
            "codigo": codigo or "", "ml_avg": "" if ml_avg is None else int(ml_avg),
            "costo": "" if costo is None else costo,
            "costo_flete": "" if costo_flete is None else int(costo_flete),
            "precio_prev": previo if previo is not None else "",
            "precio_nuevo": nuevo if nuevo is not None else "",
            "variacion_ars": "" if None in (previo, nuevo) else nuevo - previo,
            "margen_pct": "" if margen_pct(nuevo, costo_flete) is None else margen_pct(nuevo, costo_flete),
            "estado": estado,
        })
        if estado != "sin_costo" and previo is not None and nuevo != previo:
            cambios[p["id"]] = nuevo - previo
        estados[estado] = estados.get(estado, 0) + 1

    if not args.dry_run:
        dump_catalogo(catalogo, CATALOG_FILE)
        with open(REPORT_FILE, "w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(filas[0].keys()))
            writer.writeheader()
            writer.writerows(filas)
        accion = "APLICADO"
    else:
        accion = "SIMULACIÓN (--dry-run)"

    print(f"[{accion}] productos analizados: {len(catalogo)}")
    print("Estados:", json.dumps(estados, ensure_ascii=False))
    if cambios:
        vals = list(cambios.values())
        subidas = sum(1 for v in vals if v > 0)
        bajadas = len(vals) - subidas
        print(
            f"Cambios: {len(cambios)} | suben {subidas} (promedio +{sum(v for v in vals if v>0)//subidas if subidas else 0}) "
            f"| bajan {bajadas} (promedio {sum(v for v in vals if v<0)//bajadas if bajadas else 0})"
        )
    else:
        print("Sin cambios de precio.")
    if not args.dry_run:
        print(f"Catálogo: {CATALOG_FILE}\nReporte: {REPORT_FILE}")


if __name__ == "__main__":
    sys.exit(main())