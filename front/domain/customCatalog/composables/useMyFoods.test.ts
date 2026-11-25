import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// One shared session for the test and for the plugin that already asked for the
// list when the app started: both read the same ref, whichever handler runs.
const { myCustomFoods, user } = await vi.hoisted(async () => {
  const { ref } = await import('vue');

  return { myCustomFoods: vi.fn(), user: ref<{ id: string } | undefined>(undefined) };
});

mockNuxtImport('GqlMyCustomFoods', () => myCustomFoods);
mockNuxtImport('useAuth', () => (): { user: typeof user } => ({ user }));

const settle = async (): Promise<void> => {
  for (let turn = 0; turn < 6; turn += 1) await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach((): void => {
  myCustomFoods.mockReset();
  user.value = { id: 'u1' };
  clearNuxtData();
});

describe('useMyFoods', () => {
  it('does not ask the API for the foods of nobody once the session ends', async () => {
    const { foods, hasFailed } = useMyFoods();
    await settle();
    myCustomFoods.mockClear();

    user.value = undefined;
    await settle();

    expect(myCustomFoods).not.toHaveBeenCalled();
    expect(foods.value).toEqual([]);
    expect(hasFailed.value).toBe(false);
  });

  it('says the list could not be loaded instead of passing it off as empty', async () => {
    myCustomFoods.mockRejectedValue(new Error('offline'));
    const { foods, hasFailed } = useMyFoods();
    await settle();

    expect(foods.value).toEqual([]);
    expect(hasFailed.value).toBe(true);
  });
});
