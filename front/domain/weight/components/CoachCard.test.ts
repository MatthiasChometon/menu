import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CoachCard from './CoachCard.vue';

const { state, adjustTargets } = vi.hoisted(() => ({
  state: {
    entries: [] as { id: string; date: string; kg: number }[],
    hasAnswered: true,
  },
  adjustTargets: vi.fn(),
}));

// The verdict logic itself is covered by useWeightCoach's own tests; this only
// checks the card actually shows what the composables hand it, and that the
// adjust action reaches the profile composable's own mutation.
mockNuxtImport(
  'useWeightLog',
  () => (): { entries: Ref<{ id: string; date: string; kg: number }[]> } => ({
    entries: ref(state.entries),
  }),
);

mockNuxtImport(
  'useProfile',
  () =>
    (): { hasAnswered: Ref<boolean>; adjustTargets: typeof adjustTargets } => ({
      hasAnswered: ref(state.hasAnswered),
      adjustTargets,
    }),
);

beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
  state.hasAnswered = true;
  adjustTargets.mockClear();
  adjustTargets.mockResolvedValue(undefined);
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
    // Nothing to act on: no target to nudge either way.
    expect(wrapper.text()).not.toContain('Ajuster mes cibles');
  });

  it('always spells out that the advice is only indicative', async () => {
    state.entries = [];

    const wrapper = await mountSuspended(CoachCard);

    expect(wrapper.text()).toContain('Indicatif');
  });

  it('offers to apply the suggestion when a profile exists to adjust', async () => {
    state.entries = [
      { id: 'a', date: '2026-08-01', kg: 80 },
      { id: 'b', date: '2026-08-15', kg: 80.1 },
    ];
    state.hasAnswered = true;

    const wrapper = await mountSuspended(CoachCard);

    expect(wrapper.text()).toContain('Ajuster mes cibles');
  });

  it('points at the profile instead of the button when there is none yet', async () => {
    state.entries = [
      { id: 'a', date: '2026-08-01', kg: 80 },
      { id: 'b', date: '2026-08-15', kg: 80.1 },
    ];
    state.hasAnswered = false;

    const wrapper = await mountSuspended(CoachCard);

    expect(wrapper.text()).not.toContain('Ajuster mes cibles');
    expect(wrapper.text()).toContain("Remplis d'abord ton profil");
  });

  it('applies the suggestion and confirms it only after an explicit click', async () => {
    state.entries = [
      { id: 'a', date: '2026-08-01', kg: 80 },
      { id: 'b', date: '2026-08-15', kg: 80.1 },
    ];

    const wrapper = await mountSuspended(CoachCard);
    expect(adjustTargets).not.toHaveBeenCalled();

    await wrapper.find('button').trigger('click');

    expect(adjustTargets).toHaveBeenCalledWith(150);
    expect(wrapper.text()).toContain('Cibles ajustées');
  });

  it('shows a failure message when the adjustment does not go through', async () => {
    state.entries = [
      { id: 'a', date: '2026-08-01', kg: 80 },
      { id: 'b', date: '2026-08-15', kg: 80.1 },
    ];
    adjustTargets.mockRejectedValue(new Error('network down'));

    const wrapper = await mountSuspended(CoachCard);
    await wrapper.find('button').trigger('click');

    expect(wrapper.text()).toContain("n'a pas fonctionné");
  });
});
