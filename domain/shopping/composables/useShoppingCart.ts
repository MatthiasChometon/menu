export const useShoppingCart = (
  weekOf: string,
): {
  pickedIds: Ref<string[]>;
  isPicked: (foodId: string) => boolean;
  toggle: (foodId: string) => void;
  clear: () => void;
} => {
  // Keyed by week so a new menu starts with an empty basket without the old
  // ticks bleeding in.
  const pickedIds = useLocalStorage<string[]>(`shopping:${weekOf}`, []);

  return {
    pickedIds,
    isPicked: (foodId: string): boolean => pickedIds.value.includes(foodId),
    toggle: (foodId: string): void => {
      pickedIds.value = pickedIds.value.includes(foodId)
        ? pickedIds.value.filter((id): boolean => id !== foodId)
        : [...pickedIds.value, foodId];
    },
    clear: (): void => {
      pickedIds.value = [];
    },
  };
};
