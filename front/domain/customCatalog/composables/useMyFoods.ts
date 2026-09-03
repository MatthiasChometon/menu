import type { CustomFood, CustomFoodDraft } from '../types/customCatalog.type';

export const useMyFoods = (): {
  foods: Ref<CustomFood[]>;
  isLoading: ComputedRef<boolean>;
  create: (draft: CustomFoodDraft) => Promise<void>;
  update: (id: string, draft: CustomFoodDraft) => Promise<void>;
  remove: (id: string) => Promise<void>;
} => {
  // Browser-only and shared, like the household members it sits beside: the
  // prerender has no session cookie, so asking the API there would only ever
  // return nothing.
  const { data, status, refresh } = useAsyncData(
    'my-custom-foods',
    async (): Promise<CustomFood[]> => {
      const result = await GqlMyCustomFoods().catch((): undefined => undefined);

      return result?.myCustomFoods ?? [];
    },
    { server: false, dedupe: 'defer', default: (): CustomFood[] => [] },
  );

  return {
    foods: data as Ref<CustomFood[]>,
    isLoading: computed((): boolean => status.value === 'pending'),
    // Reloaded rather than patched in place: the list is ordered by the
    // server, and guessing where a new food belongs is how a list starts to
    // disagree with the one behind it.
    create: async (draft): Promise<void> => {
      await GqlCreateCustomFood({ input: draft });
      await refresh();
    },
    update: async (id, draft): Promise<void> => {
      await GqlUpdateCustomFood({ input: { id, ...draft } });
      await refresh();
    },
    remove: async (id): Promise<void> => {
      await GqlDeleteCustomFood({ id });
      await refresh();
    },
  };
};
