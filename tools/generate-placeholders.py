#!/usr/bin/env python3
"""Genera imágenes placeholder (SVG) para los productos del catálogo.

Lee data/products.json y crea images/perfumes/<id>.svg si el archivo no
existe. No sobrescribe imágenes existentes salvo con --overwrite.

Uso:
    python tools/generate-placeholders.py
    python tools/generate-placeholders.py --overwrite
"""

import colorsys
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data" / "products.json"
OUT_DIR = ROOT / "images" / "perfumes"
FALLBACK_FILE = ROOT / "images" / "placeholders" / "placeholder.svg"


def dark_bg(index):
    """Color de fondo oscuro levemente variado por producto."""
    h = (index * 0.61803398875) % 1.0
    r, g, b = colorsys.hls_to_rgb(h, 0.16, 0.25)
    return "#{:02x}{:02x}{:02x}".format(int(r * 255), int(g * 255), int(b * 255))


def accent_color(index):
    h = (index * 0.61803398875) % 1.0
    r, g, b = colorsys.hls_to_rgb(h, 0.72, 0.45)
    return "#{:02x}{:02x}{:02x}".format(int(r * 255), int(g * 255), int(b * 255))


def esc(text):
    """Escapa texto para SVG/XML."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def bottle_svg(name, brand, bg, accent, filename_text=None):
    brand = esc(brand.upper())
    name = esc(name)
    label = esc(filename_text or brand)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" width="600" height="750" font-family="Georgia, 'Times New Roman', serif">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{bg}"/>
      <stop offset="1" stop-color="#0b0b0f"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbf7ee"/>
      <stop offset="1" stop-color="#e6dcc8"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.5" cy="0.34" r="0.55">
      <stop offset="0" stop-color="{accent}" stop-opacity="0.20"/>
      <stop offset="1" stop-color="{accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="600" height="750" fill="url(#bg)"/>
  <rect width="600" height="750" fill="url(#halo)"/>
  <circle cx="300" cy="330" r="168" fill="none" stroke="{accent}" stroke-opacity="0.28" stroke-width="1.4"/>

  <ellipse cx="300" cy="560" rx="150" ry="16" fill="#000000" opacity="0.25"/>

  <g>
    <rect x="262" y="208" width="76" height="46" rx="9" fill="{accent}"/>
    <rect x="270" y="196" width="60" height="20" rx="9" fill="#0c0c10"/>
    <rect x="284" y="252" width="32" height="46" fill="{accent}" opacity="0.85"/>
    <rect x="178" y="296" width="244" height="252" rx="30" fill="url(#glass)"/>
    <rect x="178" y="470" width="244" height="78" rx="30" fill="#000000" opacity="0.08"/>

    <text x="300" y="270" text-anchor="middle" font-size="15" letter-spacing="5" fill="#fbf7ee">{label}</text>

    <g stroke="{accent}" stroke-width="1">
      <line x1="224" y1="352" x2="376" y2="352"/>
      <line x1="224" y1="366" x2="376" y2="366"/>
    </g>
    <text x="300" y="420" text-anchor="middle" font-size="19" letter-spacing="6" fill="#19181a">{name}</text>
    <text x="300" y="452" text-anchor="middle" font-size="11" letter-spacing="3" fill="#7d7463">{brand}</text>
  </g>

  <line x1="260" y1="634" x2="340" y2="634" stroke="{accent}" stroke-opacity="0.55"/>
  <text x="300" y="672" text-anchor="middle" font-size="24" letter-spacing="4" fill="#f4efe4">{name}</text>
</svg>
'''


def generate():
    with open(DATA_FILE, encoding="utf-8") as fh:
        data = json.load(fh)
    products = data if isinstance(data, list) else data.get("products", [])

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (ROOT / "images" / "placeholders").mkdir(parents=True, exist_ok=True)

    overwrite = "--overwrite" in sys.argv
    created = 0

    for i, p in enumerate(products):
        pid = p.get("id", f"perfume-{i+1:03d}")
        name = p.get("name", "Perfume")
        brand = p.get("brand", "")
        out = OUT_DIR / f"{pid}.svg"

        if out.exists() and not overwrite:
            continue
        out.write_text(
            bottle_svg(name, brand, dark_bg(i), accent_color(i)),
            encoding="utf-8",
        )
        created += 1

    # Placeholder genérico (fallback ante imágenes rotas/faltantes).
    if not FALLBACK_FILE.exists() or overwrite:
        FALLBACK_FILE.write_text(
            bottle_svg("Perfume", "LuxAroma Parfum", "#1c1c22", "#b98a3c"),
            encoding="utf-8",
        )
        if not (FALLBACK_FILE.exists() and not overwrite and False):
            created += 0

    print(f"Productos: {len(products)} | Imágenes generadas ahora: {created}")


if __name__ == "__main__":
    generate()