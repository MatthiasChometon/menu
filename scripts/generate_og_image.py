"""Genere les images d'apercu de lien (Open Graph) du site.

Usage:
    python scripts/generate_og_image.py

Quand on colle l'URL du site dans Discord, WhatsApp ou Slack, la plateforme va
lire les balises og: de la page et fabrique une carte. Sans image, la carte est
une ligne de texte grise ; avec, c'est une vignette qu'on reconnait.

Une image par langue : la marque elle-meme est traduite ("Menu de la semaine" /
"Week menu"), donc une seule carte afficherait du francais a un anglophone.

Reprend le motif d'assiette et le degrade de generate_icons.py : l'apercu doit
etre reconnaissable comme le meme produit que l'icone installee sur le telephone.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONT = PROJECT_ROOT / "front"
PUBLIC_DIR = FRONT / "public"
TRANSLATION_DIR = FRONT / "domain" / "menu" / "translation"

# Le format que toutes les plateformes recadrent le mieux : 1.91:1.
WIDTH, HEIGHT = 1200, 630

TOP = (132, 204, 22)
BOTTOM = (63, 98, 18)
PLATE = (255, 255, 255)
SLICES = ((236, 252, 203), (190, 242, 100), (101, 163, 13))
TITLE_COLOUR = (255, 255, 255)
TAGLINE_COLOUR = (217, 249, 157)
LEAD_COLOUR = (236, 252, 203)

# Rendu en 2x puis reduit : les cercles et le texte sortent nets sans avoir a
# gerer l'antialiasing a la main.
SUPERSAMPLE = 2

FONT_CANDIDATES = {
    "bold": ("C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf"),
    "semibold": ("C:/Windows/Fonts/seguisb.ttf", "C:/Windows/Fonts/arialbd.ttf"),
    "regular": ("C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"),
}


def load_font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES[weight]:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    raise SystemExit(f"Aucune police '{weight}' trouvee parmi {FONT_CANDIDATES[weight]}")


def wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, limit: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        candidate = f"{current} {word}".strip()
        if current and draw.textlength(candidate, font=font) > limit:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def draw_card(brand: str, tagline: str, lead: str) -> Image.Image:
    width, height = WIDTH * SUPERSAMPLE, HEIGHT * SUPERSAMPLE
    image = Image.new("RGB", (width, height), TOP)
    draw = ImageDraw.Draw(image)

    for y in range(height):
        ratio = y / (height - 1)
        draw.line(
            [(0, y), (width, y)],
            fill=tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * ratio) for i in range(3)),
        )

    # L'assiette, a droite, largement debordante : elle sert de motif de fond
    # plutot que d'illustration, pour ne pas concurrencer le titre.
    diameter = height * 0.92
    left = width - diameter * 0.62
    top = (height - diameter) / 2
    plate = [left, top, left + diameter, top + diameter]
    draw.ellipse(plate, fill=PLATE)

    inset = diameter * 0.16
    food = [plate[0] + inset, plate[1] + inset, plate[2] - inset, plate[3] - inset]
    for index, colour in enumerate(SLICES):
        draw.pieslice(food, start=-90 + index * 120, end=-90 + (index + 1) * 120, fill=colour)

    hole = diameter * 0.34
    draw.ellipse(
        [plate[0] + hole, plate[1] + hole, plate[2] - hole, plate[3] - hole], fill=PLATE
    )

    title_font = load_font("bold", 84 * SUPERSAMPLE)
    tagline_font = load_font("semibold", 40 * SUPERSAMPLE)
    lead_font = load_font("regular", 32 * SUPERSAMPLE)

    margin = 72 * SUPERSAMPLE
    text_width = int(left - margin * 1.6)

    y = margin + 40 * SUPERSAMPLE
    for line in wrap(draw, brand, title_font, text_width):
        draw.text((margin, y), line, font=title_font, fill=TITLE_COLOUR)
        y += int(title_font.size * 1.15)

    y += 12 * SUPERSAMPLE
    draw.text((margin, y), tagline, font=tagline_font, fill=TAGLINE_COLOUR)
    y += int(tagline_font.size * 1.9)

    for line in wrap(draw, lead, lead_font, text_width):
        draw.text((margin, y), line, font=lead_font, fill=LEAD_COLOUR)
        y += int(lead_font.size * 1.35)

    return image.resize((WIDTH, HEIGHT), Image.LANCZOS)


def main() -> None:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    for locale in ("fr", "en"):
        # Les mots viennent des traductions du site, jamais recopies ici : une
        # carte qui contredit la page qu'elle annonce est pire que pas de carte.
        messages = json.loads((TRANSLATION_DIR / f"{locale}.json").read_text(encoding="utf-8"))
        menu = messages["menu"]

        card = draw_card(menu["brand"], menu["tagline"], menu["pageLead"])
        name = f"og-{locale}.png"
        card.save(PUBLIC_DIR / name, format="PNG", optimize=True)
        print(f"{name} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()
