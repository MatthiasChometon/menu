import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import MonthlyRecapCard from './MonthlyRecapCard.vue';
import type { WeekAdherence } from '../../menu/composables/useAdherence';
import type { WeightEntry } from '../../weight/types/weight.type';

const { state, card, refresh } = vi.hoisted(() => ({
  state: { history: [] as WeekAdherence[], entries: [] as WeightEntry[], hasFailed: false },
  refresh: vi.fn(),
  card: {
    draw: vi.fn(),
    downloadOrFail: vi.fn(),
    shareOrFail: vi.fn(),
  },
}));

// The canvas and the share sheet are the browser's: what is under test is what
// the card says and names when they succeed or fail.
mockNuxtImport('useMonthlyRecapCard', () => (): typeof card & { canShareFiles: () => boolean } => ({
  ...card,
  canShareFiles: (): boolean => true,
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
  card.draw.mockReset().mockResolvedValue(undefined);
  card.downloadOrFail.mockReset().mockResolvedValue(undefined);
  card.shareOrFail.mockReset().mockResolvedValue(true);
});

afterEach((): void => {
  vi.useRealTimers();
});

const withARecap = (): void => {
  state.entries = [
    { id: 'a', date: '2026-08-01', kg: 80 },
    { id: 'b', date: '2026-08-15', kg: 81 },
  ];
};

const buttonSaying = (
  wrapper: Awaited<ReturnType<typeof mountSuspended>>,
  words: string,
): { trigger: (event: string) => Promise<void> } => {
  const button = wrapper
    .findAll('button')
    .find((candidate: { text: () => string }): boolean => candidate.text().includes(words));
  if (button === undefined) throw new Error(`No button reads "${words}".`);

  return button;
};

describe('MonthlyRecapCard', () => {
  it('says the weigh-ins could not be loaded, and retries, instead of claiming there is no data', async () => {
    state.hasFailed = true;

    const wrapper = await mountSuspended(MonthlyRecapCard);

    expect(wrapper.find('[role="alert"]').text()).toContain("n'a pas pu être calculé");
    expect(wrapper.text()).not.toContain('Pas encore assez de données');

    await buttonSaying(wrapper, 'Réessayer').trigger('click');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

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

  it('names the saved card with the Paris day, not the UTC one', async () => {
    withARecap();
    // 00:30 on 21 August in Paris, still the 20th in UTC.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-20T22:30:00Z'));

    const wrapper = await mountSuspended(MonthlyRecapCard);
    await buttonSaying(wrapper, 'Télécharger').trigger('click');
    await flushPromises();

    expect(card.downloadOrFail).toHaveBeenCalledWith(
      expect.anything(),
      'menu-bilan-2026-08-21.png',
    );
  });

  it('says nothing is wrong when the card downloads', async () => {
    withARecap();

    const wrapper = await mountSuspended(MonthlyRecapCard);
    await buttonSaying(wrapper, 'Télécharger').trigger('click');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('says so when the card cannot be turned into an image', async () => {
    withARecap();
    card.downloadOrFail.mockRejectedValue(new Error('no image'));

    const wrapper = await mountSuspended(MonthlyRecapCard);
    await buttonSaying(wrapper, 'Télécharger').trigger('click');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toContain("Le bilan n'a pas pu être créé");
  });

  it('says so when the share fails, and stops spinning', async () => {
    withARecap();
    card.shareOrFail.mockRejectedValue(new Error('share refused'));

    const wrapper = await mountSuspended(MonthlyRecapCard);
    await buttonSaying(wrapper, 'Partager').trigger('click');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toContain("Le bilan n'a pas pu être créé");
    expect(buttonSaying(wrapper, 'Partager')).toBeDefined();
    expect(wrapper.find('button[disabled]').exists()).toBe(false);
  });

  it('says so when the card cannot even be drawn', async () => {
    withARecap();
    card.draw.mockRejectedValue(new Error('no canvas'));

    const wrapper = await mountSuspended(MonthlyRecapCard);
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });
});
