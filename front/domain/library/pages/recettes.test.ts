import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Recettes from './recettes.vue';

const { state, refresh } = vi.hoisted(() => ({
  state: { hasFailed: false },
  refresh: vi.fn(),
}));

mockNuxtImport('useAuth', () => (): { user: Ref<{ id: string }>; isLoading: Ref<boolean> } => ({
  user: ref({ id: 'u1' }),
  isLoading: ref(false),
}));

mockNuxtImport(
  'useMyRecipes',
  () =>
    (): {
      recipes: Ref<never[]>;
      isLoading: Ref<boolean>;
      hasFailed: Ref<boolean>;
      refresh: typeof refresh;
      create: () => void;
      update: () => void;
      remove: () => void;
    } => ({
      recipes: ref([]),
      isLoading: ref(false),
      hasFailed: ref(state.hasFailed),
      refresh,
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    }),
);

beforeEach(async (): Promise<void> => {
  await useNuxtApp().$i18n.setLocale('fr');
  state.hasFailed = false;
  refresh.mockReset();
});

describe('the recipes page', () => {
  it('says nothing is wrong when the reader recipes loaded', async () => {
    const wrapper = await mountSuspended(Recettes);

    expect(wrapper.text()).not.toContain("n'ont pas pu être chargées");
  });

  it('says the own recipes could not be loaded, and offers to retry, instead of showing a grid that looks complete', async () => {
    state.hasFailed = true;

    const wrapper = await mountSuspended(Recettes);

    expect(wrapper.find('[role="alert"]').text()).toContain("n'ont pas pu être chargées");

    const retry = wrapper
      .findAll('button')
      .find((candidate): boolean => candidate.text() === 'Réessayer');
    await retry?.trigger('click');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
