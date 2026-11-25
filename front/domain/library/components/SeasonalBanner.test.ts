import { mountSuspended } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SeasonalBanner from './SeasonalBanner.vue';

beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
});

afterEach((): void => {
  vi.useRealTimers();
});

describe('the seasonal banner', () => {
  it('names the month on the Paris calendar, the one the produce is in season for', async () => {
    // 22:00 on 31 August in Paris: already September in Auckland, the zone the
    // suite runs in.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-31T20:00:00Z'));

    const wrapper = await mountSuspended(SeasonalBanner, { props: { foodIds: ['tomato'] } });

    expect(wrapper.text()).toContain('août');
    expect(wrapper.text()).not.toContain('septembre');
  });
});
