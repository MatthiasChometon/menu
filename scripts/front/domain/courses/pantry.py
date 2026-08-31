"""Calcule ce qui reste en stock apres la semaine, et le deduit de la prochaine commande.

Usage:
    python scripts/front/domain/courses/pantry.py --preview     # ce qu'il restera, sans rien ecrire
    python scripts/front/domain/courses/pantry.py --update      # ecrit content/pantry.json
    python scripts/front/domain/courses/pantry.py --show        # le stock actuellement enregistre

On achete des paquets entiers mais on ne consomme que le besoin : un litre d'huile
pour 114 ml utilises laisse 386 ml pour la semaine suivante. Ce fichier evite de
racheter ce qui dort deja dans le placard.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[4]
CONTENT = PROJECT_ROOT / "front" / "content"
PANTRY = CONTENT / "pantry.json"

# Ce qui ne se garde pas d'une semaine sur l'autre : inutile de compter un reste
# de saumon ou de salade comme du stock.
PERISHABLE_AISLES = {"butcher", "produce"}
PERISHABLE_IDS = {"skyr", "quark", "egg", "wholeMilk", "semiSkimmedMilk", "hardCheese"}


def load(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def needs_of_current_menu() -> tuple[str, dict[str, float]]:
    menus = sorted(CONTENT.glob("menus/*.json"), reverse=True)
    if not menus:
        raise SystemExit("aucun menu dans content/menus/")

    menu = load(menus[0])
    needs: dict[str, float] = {}
    for day in menu["days"].values():
        for meal in day.values():
            for food_id, grams in meal["foods"].items():
                needs[food_id] = needs.get(food_id, 0) + grams

    return menu["weekOf"], needs


def keeps(food_id: str, food: dict) -> bool:
    return food_id not in PERISHABLE_IDS and food.get("aisle") not in PERISHABLE_AISLES


def compute() -> tuple[str, list[dict]]:
    week, needs = needs_of_current_menu()
    foods = load(CONTENT / "foods.json")
    bought = load(CONTENT / "carrefour-products.json")
    previous = load(PANTRY).get("items", {}) if PANTRY.exists() else {}

    rows = []
    for food_id, product in bought.items():
        if food_id.startswith("_"):
            continue

        food = foods[food_id]
        stocked = previous.get(food_id, 0)
        purchased = product["size"] * product["units"]
        left = round(stocked + purchased - needs.get(food_id, 0))

        rows.append(
            {
                "id": food_id,
                "name": food["name"]["fr"],
                "unit": food.get("unit", "g"),
                "purchased": purchased,
                "used": round(needs.get(food_id, 0)),
                "left": max(0, left),
                "keeps": keeps(food_id, food),
                "product": product["name"],
            }
        )

    rows.sort(key=lambda row: (not row["keeps"], -row["left"]))
    return week, rows


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preview", action="store_true")
    parser.add_argument("--update", action="store_true")
    parser.add_argument("--show", action="store_true")
    args = parser.parse_args()

    if args.show:
        if not PANTRY.exists():
            print("aucun stock enregistre")
            return 0
        pantry = load(PANTRY)
        print(f"STOCK apres la semaine {pantry['afterWeek']}")
        for food_id, amount in sorted(pantry["items"].items(), key=lambda kv: -kv[1]):
            print(f"  {food_id:<20} {amount}")
        return 0

    week, rows = compute()
    kept = [row for row in rows if row["keeps"] and row["left"] > 0]

    print(f"APRES LA SEMAINE {week} — ce qu'il restera\n")
    print("Se garde (a deduire de la prochaine commande) :")
    for row in kept:
        print(
            f"  {row['name']:<28} {row['left']:>5} {row['unit']:<3}"
            f"  (achete {row['purchased']}, utilise {row['used']})"
        )

    perishable = [row for row in rows if not row["keeps"] and row["left"] > 0]
    if perishable:
        print("\nA consommer, pas compte en stock (frais) :")
        for row in perishable:
            print(f"  {row['name']:<28} {row['left']:>5} {row['unit']}")

    short = [row for row in rows if row["left"] == 0 and row["used"] > row["purchased"]]
    if short:
        print("\nJuste ou insuffisant :")
        for row in short:
            print(f"  {row['name']:<28} besoin {row['used']}, achete {row['purchased']}")

    if args.update:
        PANTRY.write_text(
            json.dumps(
                {
                    "afterWeek": week,
                    "items": {row["id"]: row["left"] for row in kept},
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        print(f"\n{len(kept)} produits enregistres dans {PANTRY.relative_to(PROJECT_ROOT)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
