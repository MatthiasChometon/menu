import { renderSuspended } from '@nuxt/test-utils/runtime';
import { screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it } from 'vitest';
import AdherenceHistory from './AdherenceHistory.vue';
import type { WeekAdherence } from '../composables/useAdherence';

const weekWith = (overrides: Partial<WeekAdherence>): WeekAdherence => ({
  weekOf: '2026-08-03',
  eatenCount: 0,
  totalCount: 35,
  rate: 0,
  ...overrides,
});

// The i18n locale is shared across the test app, so each file pins the one it
// asserts on instead of inheriting whatever ran before.
beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('AdherenceHistory', () => {
  it('lists every week it is given, most recent last', async () => {
    await renderSuspended(AdherenceHistory, {
      props: {
        history: [
          weekWith({ weekOf: '2026-07-20', rate: 0.4 }),
          weekWith({ weekOf: '2026-07-27', rate: 0.7 }),
        ],
      },
    });

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('40%')).toBeTruthy();
    expect(screen.getByText('70%')).toBeTruthy();
  });

  it('marks the last week in the list as the current one', async () => {
    await renderSuspended(AdherenceHistory, {
      props: {
        history: [weekWith({ weekOf: '2026-07-20', rate: 0.4 }), weekWith({ rate: 0.7 })],
      },
    });

    expect(screen.getByText('Cette semaine')).toBeTruthy();
  });
});
