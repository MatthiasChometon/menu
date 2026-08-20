export type SlotWindow = { weekday: number; startMinute: number; endMinute: number };

export const useSlotWindows = (): {
  windows: Ref<SlotWindow[]>;
  isSaving: Ref<boolean>;
  refresh: () => Promise<void>;
  save: (windows: SlotWindow[]) => Promise<void>;
} => {
  const windows = ref<SlotWindow[]>([]);
  const isSaving = ref(false);

  const refresh = async (): Promise<void> => {
    const result = await GqlMyGrocerySlotWindows().catch((): undefined => undefined);
    windows.value = result?.myGrocerySlotWindows ?? [];
  };

  const save = async (next: SlotWindow[]): Promise<void> => {
    isSaving.value = true;

    try {
      const result = await GqlSaveGrocerySlotWindows({ input: { windows: next } });
      windows.value = result.saveGrocerySlotWindows;
    } finally {
      isSaving.value = false;
    }
  };

  return { windows, isSaving, refresh, save };
};
