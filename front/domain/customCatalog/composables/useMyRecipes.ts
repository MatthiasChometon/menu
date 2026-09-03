import type { CustomRecipe, CustomRecipeDraft } from '../types/customCatalog.type';

export const useMyRecipes = (): {
  recipes: Ref<CustomRecipe[]>;
  isLoading: ComputedRef<boolean>;
  create: (draft: CustomRecipeDraft) => Promise<void>;
  update: (id: string, draft: CustomRecipeDraft) => Promise<void>;
  remove: (id: string) => Promise<void>;
} => {
  // Browser-only and shared, like the household members it sits beside: the
  // prerender has no session cookie, so asking the API there would only ever
  // return nothing.
  const { data, status, refresh } = useAsyncData(
    'my-custom-recipes',
    async (): Promise<CustomRecipe[]> => {
      const result = await GqlMyCustomRecipes().catch((): undefined => undefined);

      return result?.myCustomRecipes ?? [];
    },
    { server: false, dedupe: 'defer', default: (): CustomRecipe[] => [] },
  );

  return {
    recipes: data as Ref<CustomRecipe[]>,
    isLoading: computed((): boolean => status.value === 'pending'),
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
