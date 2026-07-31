"""Genere les photos des plats et des ingredients avec ComfyUI.

Prerequis : ComfyUI lance sur http://127.0.0.1:8188.

Usage:
    python scripts/generate_images.py --only chiliChicken,banana   # essai cible
    python scripts/generate_images.py --recipes                    # les 16 plats
    python scripts/generate_images.py --foods                      # les ingredients
    python scripts/generate_images.py --all --force                # tout regenerer

Les images arrivent dans assets/images/recipe|food/<id>.webp, ou le site les
decouvre par glob. Une image deja presente est ignoree sauf avec --force.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image

COMFY = "http://127.0.0.1:8188"
PROJECT_ROOT = Path(__file__).resolve().parent.parent
COMFY_DIR = Path(__file__).resolve().parent / "comfy"
ASSETS = PROJECT_ROOT / "assets" / "images"

RECIPE_SIZE = (1024, 640)
FOOD_SIZE = (768, 768)
WEBP_QUALITY = 82


def post_prompt(workflow: dict) -> str:
    request = urllib.request.Request(
        f"{COMFY}/prompt",
        data=json.dumps({"prompt": workflow}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)["prompt_id"]


def wait_for_image(prompt_id: str, timeout: float = 300) -> bytes:
    deadline = time.monotonic() + timeout

    while time.monotonic() < deadline:
        with urllib.request.urlopen(f"{COMFY}/history/{prompt_id}", timeout=30) as response:
            history = json.load(response)

        entry = history.get(prompt_id)
        if entry is not None:
            status = entry.get("status", {})
            if status.get("status_str") == "error":
                raise RuntimeError(f"ComfyUI a echoue: {status}")

            for output in entry.get("outputs", {}).values():
                for image in output.get("images", []):
                    query = urllib.parse.urlencode(
                        {
                            "filename": image["filename"],
                            "subfolder": image.get("subfolder", ""),
                            "type": image.get("type", "output"),
                        }
                    )
                    with urllib.request.urlopen(f"{COMFY}/view?{query}", timeout=60) as view:
                        return view.read()

        time.sleep(1.5)

    raise TimeoutError(f"Aucune image apres {timeout}s pour {prompt_id}")


def build_workflow(template: dict, prompt: str, negative: str, size: tuple[int, int], seed: int) -> dict:
    workflow = json.loads(json.dumps(template))
    workflow["6"]["inputs"]["text"] = prompt
    workflow["7"]["inputs"]["text"] = negative
    workflow["5"]["inputs"]["width"], workflow["5"]["inputs"]["height"] = size
    workflow["3"]["inputs"]["seed"] = seed
    return workflow


def save_webp(raw: bytes, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(BytesIO(raw)) as image:
        image.convert("RGB").save(destination, format="WEBP", quality=WEBP_QUALITY, method=6)


def generate(kind: str, entry_id: str, subject: str, prompts: dict, template: dict, force: bool) -> bool:
    folder = "recipe" if kind == "recipe" else "food"
    destination = ASSETS / folder / f"{entry_id}.webp"

    if destination.exists() and not force:
        print(f"  = {entry_id} (deja la)")
        return False

    style = prompts["recipeStyle"] if kind == "recipe" else prompts["foodStyle"]
    size = RECIPE_SIZE if kind == "recipe" else FOOD_SIZE
    # Seed derivee de l'identifiant : une meme entree regenere le meme visuel,
    # ce qui rend les comparaisons avant/apres lisibles.
    seed = abs(hash(entry_id)) % 2_147_483_647

    workflow = build_workflow(
        template, style.replace("{subject}", subject), prompts["negative"], size, seed
    )

    started = time.monotonic()
    raw = wait_for_image(post_prompt(workflow))
    save_webp(raw, destination)

    size_kb = destination.stat().st_size / 1024
    print(f"  + {entry_id} ({time.monotonic() - started:.0f}s, {size_kb:.0f} Ko)")
    return True


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--recipes", action="store_true", help="generer les plats")
    parser.add_argument("--foods", action="store_true", help="generer les ingredients")
    parser.add_argument("--all", action="store_true", help="plats + ingredients")
    parser.add_argument("--only", help="liste d'identifiants separes par des virgules")
    parser.add_argument("--force", action="store_true", help="regenerer meme si l'image existe")
    args = parser.parse_args()

    with open(COMFY_DIR / "prompts.json", encoding="utf-8") as f:
        prompts = json.load(f)
    with open(COMFY_DIR / "food-photo.api.json", encoding="utf-8") as f:
        template = json.load(f)

    targets: list[tuple[str, str, str]] = []
    wanted = set(args.only.split(",")) if args.only else None

    for kind, key in (("recipe", "recipes"), ("food", "foods")):
        include = args.all or args.only or (args.recipes if kind == "recipe" else args.foods)
        if not include:
            continue
        for entry_id, subject in prompts[key].items():
            if wanted is None or entry_id in wanted:
                targets.append((kind, entry_id, subject))

    if not targets:
        parser.print_help()
        return 1

    print(f"{len(targets)} image(s) a generer\n")
    created = 0
    for index, (kind, entry_id, subject) in enumerate(targets, start=1):
        print(f"[{index}/{len(targets)}] {kind}", end=" ")
        if generate(kind, entry_id, subject, prompts, template, args.force):
            created += 1

    print(f"\n{created} image(s) creee(s) dans {ASSETS}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
