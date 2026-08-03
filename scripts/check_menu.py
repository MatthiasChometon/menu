"""Verifie qu'un menu de la semaine atteint les cibles nutritionnelles de Matthias.

Usage:
    python scripts/check_menu.py content/menus/2026-08-03.json
    python scripts/check_menu.py content/menus/2026-08-03.json --courses --detail

Le menu decrit chaque jour, chaque repas (recette + grammages reels en g ou ml).
Les macros viennent de content/foods.json. Voir le SKILL.md de menu.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

MACROS = ("kcal", "protein", "fat", "carbs", "fiber")
LABELS = {"kcal": "kcal", "protein": "Prot", "fat": "Lip", "carbs": "Gluc", "fiber": "Fibres"}
MEAL_ORDER = ("breakfast", "postWorkout", "lunch", "snack", "dinner")
AISLE_ORDER = ("butcher", "dairy", "produce", "frozen", "grocery", "supplement")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONT = PROJECT_ROOT / "front"


def load_foods() -> dict:
    with open(FRONT / "content" / "foods.json", encoding="utf-8") as f:
        return {k: v for k, v in json.load(f).items() if not k.startswith("_")}


def meal_totals(foods_in_meal: dict, catalog: dict, context: str) -> dict:
    total = dict.fromkeys(MACROS, 0.0)
    total["price"] = 0.0
    for food_id, grams in foods_in_meal.items():
        if food_id not in catalog:
            raise KeyError(
                f"{context}: aliment inconnu '{food_id}'. "
                f"Ajoute-le dans content/foods.json ou corrige la cle."
            )
        food = catalog[food_id]
        for macro in MACROS:
            total[macro] += food[macro] * grams / 100
        total["price"] += food.get("pricePerKg", 0.0) * grams / 1000
    # kcal recalculees depuis les macros (4/9/4), coherent avec les cibles.
    total["kcal"] = total["protein"] * 4 + total["fat"] * 9 + total["carbs"] * 4
    return total


def tolerance_for(macro: str, tolerance) -> float:
    if isinstance(tolerance, dict):
        return tolerance.get(macro, tolerance.get("default", 5))
    return tolerance


def verdict(actual: float, target: float, macro: str, tolerance) -> str:
    if target <= 0:
        return "  "
    gap = (actual - target) / target * 100
    if abs(gap) <= tolerance_for(macro, tolerance):
        return "OK"
    return "BAS" if gap < 0 else "HAUT"


def totals_line(title: str, totals: dict, targets: dict, tolerance) -> str:
    cells = []
    for macro in MACROS:
        unit = "" if macro == "kcal" else "g"
        state = verdict(totals[macro], targets.get(macro, 0), macro, tolerance)
        cells.append(f"{LABELS[macro]} {totals[macro]:>5.0f}{unit} {state:<4}")
    return f"{title:<12} " + " ".join(cells)


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("menu", type=Path, help="chemin du menu JSON a verifier")
    parser.add_argument("--courses", action="store_true", help="liste de courses par rayon")
    parser.add_argument("--detail", action="store_true", help="detail repas par repas")
    args = parser.parse_args()

    catalog = load_foods()
    with open(args.menu, encoding="utf-8") as f:
        menu = json.load(f)

    targets = menu["targets"]
    tolerance = targets.get("tolerancePct", 5)
    days = menu["days"]

    print("=" * 78)
    print(
        f"MENU {menu.get('weekOf', '')} — {len(days)} jours — cibles: "
        + ", ".join(
            f"{LABELS[m]} {targets[m]} (+/-{tolerance_for(m, tolerance):.0f}%)"
            for m in MACROS
            if m in targets
        )
    )
    print("=" * 78)

    shopping: dict[str, float] = {}
    week = dict.fromkeys(MACROS, 0.0)
    week["price"] = 0.0
    alerts: list[str] = []

    for day, meals in days.items():
        totals = dict.fromkeys(MACROS, 0.0)
        totals["price"] = 0.0
        print(f"\n--- {day.upper()} ---")

        ordered = sorted(meals, key=lambda m: MEAL_ORDER.index(m) if m in MEAL_ORDER else 99)
        for meal_name in ordered:
            meal = meals[meal_name]
            subtotal = meal_totals(meal["foods"], catalog, f"{day}/{meal_name}")
            for key in list(MACROS) + ["price"]:
                totals[key] += subtotal[key]
            for food_id, grams in meal["foods"].items():
                shopping[food_id] = shopping.get(food_id, 0.0) + grams
            if args.detail:
                print(
                    f"  {meal_name:<13} {meal.get('recipe', ''):<24} "
                    f"{subtotal['kcal']:>4.0f} kcal | P {subtotal['protein']:>4.0f} "
                    f"L {subtotal['fat']:>4.0f} G {subtotal['carbs']:>4.0f}"
                )

        print(totals_line("TOTAL", totals, targets, tolerance))
        for macro in MACROS:
            if macro in targets and verdict(totals[macro], targets[macro], macro, tolerance) != "OK":
                gap = totals[macro] - targets[macro]
                alerts.append(f"{day} — {LABELS[macro]}: {gap:+.0f} vs cible")
        for key in list(MACROS) + ["price"]:
            week[key] += totals[key]

    count = len(days)
    average = {key: value / count for key, value in week.items()}
    print("\n" + "=" * 78)
    print(totals_line("MOYENNE/J", average, targets, tolerance))
    print(
        f"Cout estime: {week['price']:.0f} EUR pour {count} jours "
        f"({average['price']:.1f} EUR/jour)"
    )

    if alerts:
        print("\nA CORRIGER (hors tolerance):")
        for alert in alerts:
            print(f"  - {alert}")
    else:
        print("\nTous les jours sont dans la tolerance. Menu valide.")

    if args.courses:
        print("\n" + "=" * 78)
        print("LISTE DE COURSES")
        print("=" * 78)
        by_aisle: dict[str, list] = {}
        for food_id, grams in shopping.items():
            aisle = catalog[food_id].get("aisle", "grocery")
            by_aisle.setdefault(aisle, []).append((food_id, grams))
        aisles = sorted(by_aisle, key=lambda a: AISLE_ORDER.index(a) if a in AISLE_ORDER else 99)
        for aisle in aisles:
            print(f"\n[{aisle}]")
            for food_id, grams in sorted(by_aisle[aisle], key=lambda item: -item[1]):
                food = catalog[food_id]
                price = food.get("pricePerKg", 0.0) * grams / 1000
                unit = food.get("unit", "g")
                if grams >= 1000:
                    quantity = f"{grams / 1000:.2f} {'L' if unit == 'ml' else 'kg'}"
                else:
                    quantity = f"{grams:.0f} {unit}"
                print(f"  {food['name']['fr']:<32} {quantity:>9}   ~{price:>5.2f} EUR")

    return 1 if alerts else 0


if __name__ == "__main__":
    sys.exit(main())
