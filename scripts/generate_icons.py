"""Genere les icones PWA du projet (ecran d'accueil iOS/Android + favicon).

Usage:
    python scripts/generate_icons.py

Dessine une assiette vue de dessus sur un fond degrade lime, avec trois parts
colorees qui evoquent la repartition proteines / glucides / lipides.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONT = PROJECT_ROOT / "front"
PUBLIC_DIR = FRONT / "public"

SIZES = {"pwa-192x192.png": 192, "pwa-512x512.png": 512, "apple-touch-icon.png": 180}

TOP = (132, 204, 22)
BOTTOM = (63, 98, 18)
PLATE = (255, 255, 255)
SLICES = ((236, 252, 203), (190, 242, 100), (101, 163, 13))

SUPERSAMPLE = 4


def draw_icon(size: int) -> Image.Image:
    canvas = size * SUPERSAMPLE
    image = Image.new("RGB", (canvas, canvas), TOP)
    draw = ImageDraw.Draw(image)

    for y in range(canvas):
        ratio = y / (canvas - 1)
        draw.line(
            [(0, y), (canvas, y)],
            fill=tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * ratio) for i in range(3)),
        )

    margin = canvas * 0.16
    plate = [margin, margin, canvas - margin, canvas - margin]
    draw.ellipse(plate, fill=PLATE)

    inner = canvas * 0.26
    food = [inner, inner, canvas - inner, canvas - inner]
    for index, colour in enumerate(SLICES):
        draw.pieslice(food, start=-90 + index * 120, end=-90 + (index + 1) * 120, fill=colour)

    hole = canvas * 0.44
    draw.ellipse([hole, hole, canvas - hole, canvas - hole], fill=PLATE)

    return image.resize((size, size), Image.LANCZOS)


def main() -> None:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    for name, size in SIZES.items():
        icon = draw_icon(size)
        icon.save(PUBLIC_DIR / name, format="PNG", optimize=True)
        print(f"{name} ({size}x{size})")

    favicon = PUBLIC_DIR / "favicon.svg"
    favicon.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#84cc16"/><stop offset="1" stop-color="#3f6212"/>'
        "</linearGradient></defs>"
        '<rect width="64" height="64" rx="14" fill="url(#g)"/>'
        '<circle cx="32" cy="32" r="21" fill="#fff"/>'
        '<path d="M32 15a17 17 0 0 1 14.7 8.5L32 32Z" fill="#ecfccb"/>'
        '<path d="M46.7 23.5a17 17 0 0 1 0 17L32 32Z" fill="#bef264"/>'
        '<path d="M46.7 40.5A17 17 0 0 1 17.3 40.5L32 32Z" fill="#65a30d"/>'
        '<circle cx="32" cy="32" r="7" fill="#fff"/>'
        "</svg>\n",
        encoding="utf-8",
    )
    print("favicon.svg")


if __name__ == "__main__":
    main()
