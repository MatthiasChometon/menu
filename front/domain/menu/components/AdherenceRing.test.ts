import { renderSuspended } from '@nuxt/test-utils/runtime';
import { screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it } from 'vitest';
import AdherenceRing from './AdherenceRing.vue';

// The i18n locale is shared across the test app, so each file pins the one it
// asserts on instead of inheriting whatever ran before.
beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('AdherenceRing', () => {
  it('shows the share of meals eaten as a whole percentage', async () => {
    await renderSuspended(AdherenceRing, {
      props: { rate: 0.625, eatenCount: 5, totalCount: 8 },
    });

    expect(screen.getByText('63%')).toBeTruthy();
  });

  it('shows the count behind the percentage', async () => {
    await renderSuspended(AdherenceRing, {
      props: { rate: 0.625, eatenCount: 5, totalCount: 8 },
    });

    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('/ 8')).toBeTruthy();
    expect(screen.getByText('repas mangés')).toBeTruthy();
  });

  it('reads 0% before anything has been eaten', async () => {
    await renderSuspended(AdherenceRing, {
      props: { rate: 0, eatenCount: 0, totalCount: 8 },
    });

    expect(screen.getByText('0%')).toBeTruthy();
  });
});
