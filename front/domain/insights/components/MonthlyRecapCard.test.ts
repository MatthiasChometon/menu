import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MonthlyRecapCard from './MonthlyRecapCard.vue';
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

describe('MonthlyRecapCard', () => {
  it('invites to log a weigh-in and view the week with nothing to summarise yet', async () => {
    const wrapper = await mountSuspended(MonthlyRecapCard);

    expect(wrapper.text()).toContain('Pas encore assez de données');
  });

  it('draws the card and offers to download it once there is something to show', async () => {
    state.entries = [
      { id: 'a', date: '2026-08-01', kg: 80 },
      { id: 'b', date: '2026-08-15', kg: 81 },
    ];

    const wrapper = await mountSuspended(MonthlyRecapCard);
    await nextTick();

    expect(wrapper.find('canvas').exists()).toBe(true);
    expect(wrapper.text()).toContain('Télécharger');
  });
});
