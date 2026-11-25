import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProgressionTable from './ProgressionTable.vue';
import type { WeekAdherence } from '../../menu/composables/useAdherence';
import type { WeightEntry } from '../../weight/types/weight.type';

const { state, refresh } = vi.hoisted(() => ({
  state: { history: [] as WeekAdherence[], entries: [] as WeightEntry[], hasFailed: false },
  refresh: vi.fn(),
}));

mockNuxtImport('useAdherence', () => (): { history: Ref<WeekAdherence[]> } => ({
  history: ref(state.history),
}));
mockNuxtImport(
  'useWeightLog',
  () => (): { entries: Ref<WeightEntry[]>; hasFailed: Ref<boolean>; refresh: () => void } => ({
    entries: ref(state.entries),
    hasFailed: ref(state.hasFailed),
    refresh,
  }),
);

beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
  state.history = [];
  state.entries = [];
  state.hasFailed = false;
  refresh.mockReset();
});

describe('ProgressionTable', () => {
  it('says the weigh-ins could not be loaded, and retries, instead of inviting to log one', async () => {
    state.hasFailed = true;

    const wrapper = await mountSuspended(ProgressionTable);

    expect(wrapper.find('[role="alert"]').text()).toContain("n'a pas pu être chargé");
    expect(wrapper.text()).not.toContain('Pas encore assez de semaines suivies');

    const retry = wrapper
      .findAll('button')
      .find((candidate): boolean => candidate.text() === 'Réessayer');
    await retry?.trigger('click');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('invites to log a weigh-in and view the week when nothing is tracked yet', async () => {
    const wrapper = await mountSuspended(ProgressionTable);

    expect(wrapper.text()).toContain('Pas encore assez de semaines suivies');
  });

  it('lists each tallied week with its adherence rate and weight change', async () => {
    state.history = [{ weekOf: '2026-08-03', rate: 0.9, eatenCount: 9, totalCount: 10 }];
    state.entries = [
      { id: 'a', date: '2026-08-03', kg: 80 },
      { id: 'b', date: '2026-08-08', kg: 80.4 },
    ];

    const wrapper = await mountSuspended(ProgressionTable);

    expect(wrapper.text()).toContain('90%');
    expect(wrapper.text()).toContain('+0.4 kg');
  });

  it('marks a week without enough weigh-ins with a dash rather than a false zero', async () => {
    state.history = [{ weekOf: '2026-08-03', rate: 0.9, eatenCount: 9, totalCount: 10 }];
    state.entries = [{ id: 'a', date: '2026-08-03', kg: 80 }];

    const wrapper = await mountSuspended(ProgressionTable);

    expect(wrapper.find('tbody td:last-child').text()).toBe('—');
  });
});
