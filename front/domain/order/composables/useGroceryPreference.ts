export const useGroceryPreference = (): {
  thresholdCents: Ref<number | undefined>;
  isSaving: Ref<boolean>;
  isSaved: Ref<boolean>;
  refresh: () => Promise<void>;
  save: (cents: number | undefined) => Promise<void>;
} => {
  const thresholdCents = ref<number | undefined>();
  const isSaving = ref(false);
  const isSaved = ref(false);

  const refresh = async (): Promise<void> => {
    const result = await GqlMyGroceryPreference().catch((): undefined => undefined);
    thresholdCents.value = result?.myGroceryPreference.alertThresholdCents ?? undefined;
  };

  const save = async (cents: number | undefined): Promise<void> => {
    isSaving.value = true;
    isSaved.value = false;

    try {
      const result = await GqlSaveGroceryPreference({ input: { alertThresholdCents: cents } });
      thresholdCents.value = result.saveGroceryPreference.alertThresholdCents ?? undefined;
      isSaved.value = true;
    } finally {
      isSaving.value = false;
    }
  };

  return { thresholdCents, isSaving, isSaved, refresh, save };
};
