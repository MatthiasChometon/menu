import type { CustomFood, CustomFoodDraft } from '../types/customCatalog.type';

export const useMyFoods = (): {
  foods: Ref<CustomFood[]>;
  isLoading: ComputedRef<boolean>;
  /** The list could not be loaded: what is shown is not what is stored. */
  hasFailed: ComputedRef<boolean>;
  create: (draft: CustomFoodDraft) => Promise<void>;
  update: (id: string, draft: CustomFoodDraft) => Promise<void>;
  remove: (id: string) => Promise<void>;
} => {
  const { user } = useAuth();

  // Browser-only and shared, like the household members it sits beside: the
  // prerender has no session cookie, so asking the API there would only ever
  // return nothing.
  const { data, status, error, refresh } = useAsyncData(
    'my-custom-foods',
    async (): Promise<CustomFood[]> => {
      // Nobody signed in: the API would only refuse, and a refusal is not a failure.
      if (user.value === undefined) return [];

      const result = await GqlMyCustomFoods();

      return result.myCustomFoods;
    },
    { server: false, dedupe: 'defer', watch: [user], default: (): CustomFood[] => [] },
  );

  return {
    foods: data,
    isLoading: computed((): boolean => status.value === 'pending'),
    hasFailed: computed((): boolean => error.value !== undefined),
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
