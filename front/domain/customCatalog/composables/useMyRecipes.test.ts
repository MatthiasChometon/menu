import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// One shared session for the test and for the plugin that already asked for the
// list when the app started: both read the same ref, whichever handler runs.
const { myCustomRecipes, user } = await vi.hoisted(async () => {
  const { ref } = await import('vue');

  return { myCustomRecipes: vi.fn(), user: ref<{ id: string } | undefined>(undefined) };
});

mockNuxtImport('GqlMyCustomRecipes', () => myCustomRecipes);
mockNuxtImport('useAuth', () => (): { user: typeof user } => ({ user }));

const settle = async (): Promise<void> => {
  for (let turn = 0; turn < 6; turn += 1) await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach((): void => {
  myCustomRecipes.mockReset();
  user.value = { id: 'u1' };
  clearNuxtData();
});

describe('useMyRecipes', () => {
  it('does not ask the API for the recipes of nobody once the session ends', async () => {
    const { recipes, hasFailed } = useMyRecipes();
    await settle();
    myCustomRecipes.mockClear();

    user.value = undefined;
    await settle();

    expect(myCustomRecipes).not.toHaveBeenCalled();
    expect(recipes.value).toEqual([]);
    expect(hasFailed.value).toBe(false);
  });

  it('says the list could not be loaded instead of passing it off as empty', async () => {
    myCustomRecipes.mockRejectedValue(new Error('offline'));
    const { recipes, hasFailed } = useMyRecipes();
    await settle();

    expect(recipes.value).toEqual([]);
    expect(hasFailed.value).toBe(true);
  });
});
