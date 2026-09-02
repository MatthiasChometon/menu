import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import List from './List.vue';

type Entry = { id: string; date: string; kg: number };

const { state, update, remove, errorOf } = vi.hoisted(() => ({
  state: { entries: [] as Entry[] },
  update: vi.fn(),
  remove: vi.fn(),
  errorOf: vi.fn(),
}));

mockNuxtImport(
  'useWeightLog',
  () =>
    (): {
      entries: Ref<Entry[]>;
      update: typeof update;
      remove: typeof remove;
      errorOf: typeof errorOf;
      bounds: { minKg: number; maxKg: number };
      todayDate: string;
    } => ({
      entries: ref(state.entries),
      update,
      remove,
      errorOf,
      bounds: { minKg: 30, maxKg: 300 },
      todayDate: '2026-08-20',
    }),
);

beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
  update.mockClear();
  remove.mockClear();
  errorOf.mockReturnValue(undefined);
});

describe('the weigh-in list', () => {
  it('lists every weigh-in it is given, most recent first', async () => {
    state.entries = [
      { id: 'b', date: '2026-08-15', kg: 80.7 },
      { id: 'a', date: '2026-08-01', kg: 80 },
    ];

    const wrapper = await mountSuspended(List);

    expect(wrapper.findAll('li')).toHaveLength(2);
    expect(wrapper.text()).toContain('80.7');
  });

  it('shows the change against the weigh-in right before it', async () => {
    state.entries = [
      { id: 'b', date: '2026-08-15', kg: 80.7 },
      { id: 'a', date: '2026-08-01', kg: 80 },
    ];

    const wrapper = await mountSuspended(List);

    expect(wrapper.text()).toContain('+0.7');
  });

  it('asks before removing a weigh-in, and does nothing until confirmed', async () => {
    state.entries = [{ id: 'a', date: '2026-08-01', kg: 80 }];
    const wrapper = await mountSuspended(List);

    await wrapper.find('button[aria-label^="Supprimer"]').trigger('click');

    expect(wrapper.text()).toContain('Supprimer cette pesée ?');
    expect(remove).not.toHaveBeenCalled();
  });

  it('removes the weigh-in once the confirmation is pressed', async () => {
    state.entries = [{ id: 'a', date: '2026-08-01', kg: 80 }];
    const wrapper = await mountSuspended(List);

    await wrapper.find('button[aria-label^="Supprimer"]').trigger('click');
    const confirm = wrapper.findAll('button').find((button) => button.text() === 'Supprimer');
    await confirm?.trigger('click');

    expect(remove).toHaveBeenCalledWith('a');
  });

  it('opens an inline editor and saves the change made there', async () => {
    state.entries = [{ id: 'a', date: '2026-08-01', kg: 80 }];
    const wrapper = await mountSuspended(List);

    await wrapper.find('button[aria-label^="Modifier"]').trigger('click');
    await wrapper.find('input[type="number"]').setValue(79.2);
    const save = wrapper.findAll('button').find((button) => button.text() === 'Enregistrer');
    await save?.trigger('click');

    expect(update).toHaveBeenCalledWith('a', { date: '2026-08-01', kg: 79.2 });
  });

  it('never saves an inline edit that fails validation', async () => {
    state.entries = [{ id: 'a', date: '2026-08-01', kg: 80 }];
    errorOf.mockReturnValue('Ce poids semble hors de portée. Vérifie la valeur saisie.');
    const wrapper = await mountSuspended(List);

    await wrapper.find('button[aria-label^="Modifier"]').trigger('click');
    await wrapper.find('input[type="number"]').setValue(999);
    const save = wrapper.findAll('button').find((button) => button.text() === 'Enregistrer');
    await save?.trigger('click');

    expect(update).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Ce poids semble hors de portée.');
  });
});
