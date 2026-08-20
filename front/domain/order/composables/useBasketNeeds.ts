// What the week eats, food by food. The server turns this into products: it is
// the one that knows the formats sold and what the cupboard still holds.
export const useBasketNeeds = (): {
  needsOf: (menu: Menu) => { foodId: string; grams: number; label: string }[];
} => {
  // The same quantities the shopping list shows. Ordering for one what the list
  // reads out for three is the kind of mismatch nobody notices until the fridge
  // is empty on Thursday.
  const { linesFor } = useShoppingQuantities();

  return {
    needsOf: (menu: Menu): { foodId: string; grams: number; label: string }[] =>
      linesFor(menu).map((line): { foodId: string; grams: number; label: string } => ({
        foodId: line.food.id,
        grams: Math.round(line.grams),
        // The French name carries the constraint the menu holds to — "Riz
        // complet", "Steak haché 5%" — which is what a substitute must live up
        // to.
        label: line.food.name.fr,
      })),
  };
};
