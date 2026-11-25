import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Profil from './profil.vue';

const { state, refresh } = vi.hoisted(() => ({
  state: { hasFailed: false },
  refresh: vi.fn(),
}));

mockNuxtImport('useAuth', () => (): { user: Ref<{ id: string }>; isLoading: Ref<boolean> } => ({
  user: ref({ id: 'u1' }),
  isLoading: ref(false),
}));

mockNuxtImport(
  'useProfile',
  () =>
    (): {
      profile: Ref<undefined>;
      isLoading: Ref<boolean>;
      hasAnswered: Ref<boolean>;
      hasFailed: Ref<boolean>;
      refresh: () => void;
    } => ({
      profile: ref(undefined),
      isLoading: ref(false),
      hasAnswered: ref(false),
      hasFailed: ref(state.hasFailed),
      refresh,
    }),
);

beforeEach(async (): Promise<void> => {
  await useNuxtApp().$i18n.setLocale('fr');
  state.hasFailed = false;
  refresh.mockReset();
});

describe('the profile page', () => {
  it('offers the form to somebody who has not answered yet', async () => {
    const wrapper = await mountSuspended(Profil);

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Étape 1');
  });

  it('says the answers could not be loaded, and offers to retry, instead of an empty form that could overwrite them', async () => {
    state.hasFailed = true;

    const wrapper = await mountSuspended(Profil);

    expect(wrapper.find('[role="alert"]').text()).toContain("n'ont pas pu être chargées");
    expect(wrapper.text()).not.toContain('Étape 1');

    const retry = wrapper
      .findAll('button')
      .find((candidate): boolean => candidate.text() === 'Réessayer');
    await retry?.trigger('click');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
