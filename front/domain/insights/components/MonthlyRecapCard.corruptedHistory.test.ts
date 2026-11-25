import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it } from 'vitest';
import MonthlyRecapCard from './MonthlyRecapCard.vue';
import type { WeightEntry } from '../../weight/types/weight.type';

// The canvas is the browser's; the adherence history is NOT mocked here: this
// is the real read of what the device saved, whatever it left behind.
mockNuxtImport('useMonthlyRecapCard', () => (): Record<string, unknown> => ({
  draw: async (): Promise<void> => undefined,
  downloadOrFail: async (): Promise<void> => undefined,
  shareOrFail: async (): Promise<boolean> => true,
  canShareFiles: (): boolean => false,
}));

mockNuxtImport(
  'useWeightLog',
  () => (): { entries: Ref<WeightEntry[]>; hasFailed: Ref<boolean>; refresh: () => void } => ({
    entries: ref([]),
    hasFailed: ref(false),
    refresh: (): void => undefined,
  }),
);

beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('MonthlyRecapCard with a corrupted saved history', () => {
  it('shows an alert instead of the empty invitation when the saved weeks cannot be read', async () => {
    localStorage.setItem('adherence:history', '{"not": "a list of weeks"');

    const wrapper = await mountSuspended(MonthlyRecapCard);

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Pas encore assez de données');
  });
});
