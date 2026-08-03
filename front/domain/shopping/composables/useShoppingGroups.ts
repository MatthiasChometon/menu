export const useShoppingGroups = (): {
  groupsOf: (menu: Menu) => ShoppingGroup[];
} => {
  const { aisleOrder } = useFoods();

  return {
    groupsOf: (menu: Menu): ShoppingGroup[] =>
      aisleOrder
        .map((aisle): ShoppingGroup => {
          const lines = menu.shoppingList.filter((line): boolean => line.food.aisle === aisle);
          return {
            aisle,
            lines,
            price: lines.reduce((total, line): number => total + line.price, 0),
          };
        })
        .filter((group): boolean => group.lines.length > 0),
  };
};
