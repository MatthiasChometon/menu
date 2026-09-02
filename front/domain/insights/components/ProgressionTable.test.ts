import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProgressionTable from './ProgressionTable.vue';
import type { WeekAdherence } from '../../menu/composables/useAdherence';
import type { WeightEntry } from '../../weight/types/weight.type';

const { state } = vi.hoisted(() => ({
  state: { history: [] as WeekAdherence[], entries: [] as WeightEntry[] },
}));

mockNuxtImport('useAdherence', () => (): { history: Ref<WeekAdherence[]> } => ({
  history: ref(state.history),
}));
mockNuxtImport('useWeightLog', () => (): { entries: Ref<WeightEntry[]> } => ({
  entries: ref(state.entries),
}));

beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
  state.history = [];
  state.entries = [];
});

describe('ProgressionTable', () => {
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
