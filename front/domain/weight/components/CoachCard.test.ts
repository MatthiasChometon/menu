import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CoachCard from './CoachCard.vue';

const { state } = vi.hoisted(() => ({
  state: { entries: [] as { id: string; date: string; kg: number }[] },
}));

// The verdict logic itself is covered by useWeightCoach's own tests; this
// only checks the card actually shows what the composable hands it.
mockNuxtImport(
  'useWeightLog',
  () => (): { entries: Ref<{ id: string; date: string; kg: number }[]> } => ({
    entries: ref(state.entries),
  }),
);

beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('the coach card', () => {
  it('asks to wait with fewer than two weigh-ins', async () => {
    state.entries = [{ id: 'a', date: '2026-08-01', kg: 80 }];

    const wrapper = await mountSuspended(CoachCard);

    expect(wrapper.text()).toContain('Pas encore assez de données');
  });

  it('flags a stall and suggests eating a little more', async () => {
    state.entries = [
      { id: 'a', date: '2026-08-01', kg: 80 },
      { id: 'b', date: '2026-08-15', kg: 80.1 },
    ];

    const wrapper = await mountSuspended(CoachCard);

    expect(wrapper.text()).toContain('Tu stagnes');
    expect(wrapper.text()).toContain('+150 kcal');
  });

  it('flags a climb that is too fast and suggests eating a little less', async () => {
    state.entries = [
      { id: 'a', date: '2026-08-01', kg: 80 },
      { id: 'b', date: '2026-08-15', kg: 81.4 },
    ];

    const wrapper = await mountSuspended(CoachCard);

    expect(wrapper.text()).toContain('Tu montes trop vite');
    expect(wrapper.text()).toContain('100 kcal');
  });

  it('confirms a pace on target without suggesting a change', async () => {
    state.entries = [
      { id: 'a', date: '2026-08-01', kg: 80 },
      { id: 'b', date: '2026-08-15', kg: 80.7 },
    ];

    const wrapper = await mountSuspended(CoachCard);

    expect(wrapper.text()).toContain('Sur la bonne trajectoire');
  });

  it('always spells out that the advice is only indicative', async () => {
    state.entries = [];

    const wrapper = await mountSuspended(CoachCard);

    expect(wrapper.text()).toContain('Indicatif seulement');
  });
});
