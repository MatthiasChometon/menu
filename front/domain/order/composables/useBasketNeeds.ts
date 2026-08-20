// What the week eats, food by food. The server turns this into products: it is
// the one that knows the formats sold and what the cupboard still holds.
export const useBasketNeeds = (): {
  needsOf: (menu: Menu) => { foodId: string; grams: number }[];
} => ({
  needsOf: (menu: Menu): { foodId: string; grams: number }[] =>
    menu.shoppingList.map((line): { foodId: string; grams: number } => ({
      foodId: line.food.id,
      grams: Math.round(line.grams),
    })),
});
