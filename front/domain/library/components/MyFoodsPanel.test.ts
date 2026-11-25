import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MyFoodsPanel from './MyFoodsPanel.vue';

type Food = { id: string; name: string; kcal: number };

const { state, remove, refresh } = vi.hoisted(() => ({
  state: { foods: [] as Food[], hasFailed: false },
  remove: vi.fn(),
  refresh: vi.fn(),
}));

mockNuxtImport(
  'useMyFoods',
  () =>
    (): {
      foods: Ref<Food[]>;
      hasFailed: Ref<boolean>;
      refresh: typeof refresh;
      remove: typeof remove;
      create: () => void;
      update: () => void;
    } => ({
      foods: ref(state.foods),
      hasFailed: ref(state.hasFailed),
      refresh,
      remove,
      create: vi.fn(),
      update: vi.fn(),
    }),
);

beforeEach(async (): Promise<void> => {
  await useNuxtApp().$i18n.setLocale('fr');
  state.foods = [];
  state.hasFailed = false;
  remove.mockReset();
  refresh.mockReset();
});

describe('the personal foods panel', () => {
  it('says there are none when there really are none', async () => {
    const wrapper = await mountSuspended(MyFoodsPanel);

    expect(wrapper.text()).toContain('Aucun aliment personnel');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('says the foods could not be loaded, and offers to retry, rather than claiming there are none', async () => {
    state.hasFailed = true;

    const wrapper = await mountSuspended(MyFoodsPanel);

    expect(wrapper.find('[role="alert"]').text()).toContain("n'ont pas pu être chargés");
    expect(wrapper.text()).not.toContain('Aucun aliment personnel');

    const retry = wrapper
      .findAll('button')
      .find((candidate): boolean => candidate.text() === 'Réessayer');
    await retry?.trigger('click');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('says so, in an alert, when a food could not be removed', async () => {
    state.foods = [{ id: 'a', name: 'Tofu maison', kcal: 120 }];
    remove.mockRejectedValue(new Error('offline'));
    const wrapper = await mountSuspended(MyFoodsPanel);

    await wrapper.find('button[aria-label="Supprimer Tofu maison"]').trigger('click');
    const confirm = wrapper
      .findAll('button')
      .find((candidate): boolean => candidate.text() === 'Supprimer');
    await confirm?.trigger('click');
    await flushPromises();

    expect(remove).toHaveBeenCalledWith('a');
    expect(wrapper.find('[role="alert"]').text()).toContain('La suppression a échoué');
  });
});
