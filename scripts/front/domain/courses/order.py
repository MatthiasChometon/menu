"""Prepare la commande drive de la semaine : quoi acheter, en combien d'articles.

Usage:
    python scripts/front/domain/courses/order.py --list          # la liste a commander
    python scripts/front/domain/courses/order.py --check         # la semaine a-t-elle deja ete commandee ?
    python scripts/front/domain/courses/order.py --record        # marquer la semaine comme commandee
    python scripts/front/domain/courses/order.py --history       # les semaines deja commandees

Convertit chaque besoin en nombre d'articles reels : on n'achete pas 960 g de
riz mais un paquet de 1 kg. Les fruits et legumes sans conditionnement sont
commandes a la piece, sinon au poids.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[4]
CONTENT = PROJECT_ROOT / "front" / "content"
ORDERS = CONTENT / "orders.json"

AISLE_ORDER = ("butcher", "dairy", "produce", "frozen", "grocery", "supplement")
AISLE_LABELS = {
    "butcher": "Boucherie et poissonnerie",
    "dairy": "Cremerie",
    "produce": "Fruits et legumes",
    "frozen": "Surgeles",
    "grocery": "Epicerie",
    "supplement": "Complements",
}


def load_json(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def current_menu() -> tuple[str, dict]:
    menus = sorted(CONTENT.glob("menus/*.json"), reverse=True)
    if not menus:
        raise SystemExit("aucun menu dans content/menus/")
    menu = load_json(menus[0])
    return menu["weekOf"], menu


def pantry_stock(week: str) -> dict[str, float]:
    """Ce qui reste des semaines precedentes, a ne pas racheter."""
    path = CONTENT / "pantry.json"
    if not path.exists():
        return {}

    pantry = load_json(path)
    # Le stock decrit l'apres d'une semaine : il ne vaut que pour les suivantes.
    if pantry.get("afterWeek", "") >= week:
        return {}

    return pantry.get("items", {})


def shopping_lines() -> tuple[str, list[dict]]:
    week, menu = current_menu()
    foods = load_json(CONTENT / "foods.json")
    stock = pantry_stock(week)

    grams: dict[str, float] = {}
    for day in menu["days"].values():
        for meal in day.values():
            for food_id, amount in meal["foods"].items():
                grams[food_id] = grams.get(food_id, 0) + amount

    lines = []
    for food_id, raw_need in grams.items():
        food = foods[food_id]
        in_stock = stock.get(food_id, 0)
        needed = max(0, raw_need - in_stock)
        if needed == 0:
            continue
        unit = food.get("unit", "g")
        pack = food.get("pack")
        piece = food.get("pieceWeight")
        rounded = round(needed)

        if pack:
            quantity, kind = math.ceil(rounded / pack), "pack"
        elif piece:
            quantity, kind = math.ceil(rounded / piece), "piece"
        else:
            quantity, kind = rounded, "weight"

        lines.append(
            {
                "id": food_id,
                "name": food["name"]["fr"],
                "aisle": food.get("aisle", "grocery"),
                "needed": rounded,
                "inStock": round(in_stock),
                "unit": unit,
                "pack": pack,
                "quantity": quantity,
                "kind": kind,
                "price": round(food.get("pricePerKg", 0) * rounded / 1000, 2),
            }
        )

    lines.sort(key=lambda line: (AISLE_ORDER.index(line["aisle"]), -line["price"]))
    return week, lines


def describe(line: dict) -> str:
    needed = f"{line['needed']} {line['unit']}"
    if line.get("inStock"):
        needed += f", {line['inStock']} deja en stock"

    if line["kind"] == "pack":
        return f"{line['quantity']} x {line['pack']} {line['unit']} (besoin {needed})"
    if line["kind"] == "piece":
        return f"{line['quantity']} piece(s) (besoin {needed})"
    return f"{needed} au poids"


def orders() -> dict:
    return load_json(ORDERS) if ORDERS.exists() else {"orders": []}


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--record", action="store_true")
    parser.add_argument("--history", action="store_true")
    parser.add_argument("--json", action="store_true", help="sortie machine")
    parser.add_argument("--store", default="e-leclerc-lyon-9eme")
    args = parser.parse_args()

    week, lines = shopping_lines()
    done = orders()
    already = next((o for o in done["orders"] if o["weekOf"] == week), None)

    if args.check:
        if already is None:
            print(f"NON_COMMANDE {week}")
            return 0
        print(f"DEJA_COMMANDE {week} le {already['orderedAt']} chez {already['store']}")
        return 1

    if args.history:
        if not done["orders"]:
            print("aucune commande enregistree")
            return 0
        for order in done["orders"]:
            print(f"{order['weekOf']} — {order['orderedAt']} — {order['store']} — {order['items']} articles")
        return 0

    if args.record:
        if already is not None:
            print(f"deja enregistre: {week}")
            return 0
        done["orders"].append(
            {
                "weekOf": week,
                "orderedAt": args.date if hasattr(args, "date") else week,
                "store": args.store,
                "items": len(lines),
            }
        )
        done["orders"].sort(key=lambda order: order["weekOf"], reverse=True)
        with open(ORDERS, "w", encoding="utf-8", newline="\n") as f:
            json.dump(done, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"enregistre: {week} ({len(lines)} articles)")
        return 0

    if args.json:
        print(json.dumps({"weekOf": week, "lines": lines}, ensure_ascii=False, indent=2))
        return 0

    total = sum(line["price"] for line in lines)
    print(f"SEMAINE {week} — {len(lines)} articles — ~{total:.0f} EUR")
    if already is not None:
        print(f"!! DEJA COMMANDE le {already['orderedAt']}")

    aisle = None
    for line in lines:
        if line["aisle"] != aisle:
            aisle = line["aisle"]
            print(f"\n[{AISLE_LABELS.get(aisle, aisle)}]")
        print(f"  {line['name']:<30} {describe(line)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
