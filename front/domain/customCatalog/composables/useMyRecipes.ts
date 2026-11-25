import type { CustomRecipe, CustomRecipeDraft } from '../types/customCatalog.type';

export const useMyRecipes = (): {
  recipes: Ref<CustomRecipe[]>;
  isLoading: ComputedRef<boolean>;
  /** The list could not be loaded: what is shown is not what is stored. */
  hasFailed: ComputedRef<boolean>;
  create: (draft: CustomRecipeDraft) => Promise<void>;
  update: (id: string, draft: CustomRecipeDraft) => Promise<void>;
  remove: (id: string) => Promise<void>;
} => {
  const { user } = useAuth();

  // Browser-only and shared, like the household members it sits beside: the
  // prerender has no session cookie, so asking the API there would only ever
  // return nothing.
  const { data, status, error, refresh } = useAsyncData(
    'my-custom-recipes',
    async (): Promise<CustomRecipe[]> => {
      // Nobody signed in: the API would only refuse, and a refusal is not a failure.
      if (user.value === undefined) return [];

      const result = await GqlMyCustomRecipes();

      return result.myCustomRecipes;
    },
    { server: false, dedupe: 'defer', watch: [user], default: (): CustomRecipe[] => [] },
  );

  return {
    recipes: data,
    isLoading: computed((): boolean => status.value === 'pending'),
    hasFailed: computed((): boolean => error.value !== undefined),
    // Reloaded rather than patched in place: the book is ordered by the
    // server, and guessing where a new recipe belongs is how a list starts to
    // disagree with the one behind it.
    create: async (draft): Promise<void> => {
      await GqlCreateCustomRecipe({ input: draft });
      await refresh();
    },
    update: async (id, draft): Promise<void> => {
      await GqlUpdateCustomRecipe({ input: { id, ...draft } });
      await refresh();
    },
    remove: async (id): Promise<void> => {
      await GqlDeleteCustomRecipe({ id });
      await refresh();
    },
  };
};
