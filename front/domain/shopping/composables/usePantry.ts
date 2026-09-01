// What is already at home, kept on the device rather than the account: it is
// a quick "I have this" flag, not a real stock count, so it stays local and
// shared by every week rather than reset when a new menu arrives.
let stock: Ref<string[]> | undefined;

const pantryStock = (): Ref<string[]> => {
  if (stock === undefined) stock = useLocalStorage<string[]>('shopping:pantry', []);
  return stock;
};

export const usePantry = (): {
  pantryIds: ComputedRef<string[]>;
  isInPantry: (id: string) => boolean;
  toggle: (id: string) => void;
} => {
  const items = pantryStock();

  return {
    pantryIds: computed((): string[] => items.value),
    isInPantry: (id: string): boolean => items.value.includes(id),
    toggle: (id: string): void => {
      items.value = items.value.includes(id)
        ? items.value.filter((existing): boolean => existing !== id)
        : [...items.value, id];
    },
  };
};
