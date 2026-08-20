import { renderSuspended } from '@nuxt/test-utils/runtime';
import { screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it } from 'vitest';
import Cost from './Cost.vue';
import type { GroceryJob } from '../composables/useGroceryOrder';

const jobWith = (overrides: Record<string, unknown>): GroceryJob =>
  ({
    id: 'job-1',
    weekOf: '2026-08-24',
    status: 'SUCCEEDED',
    events: [],
    lines: [],
    productsCents: 8450,
    deliveryFeesCents: 790,
    shortOfMinimumCents: 0,
    overThreshold: false,
    alertThresholdCents: 12000,
    ...overrides,
  }) as GroceryJob;

// The i18n locale is shared across the test app, so each file pins the one it
// asserts on instead of inheriting whatever ran before.
beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('reading what the basket costs', () => {
  it('separates the groceries from the delivery, and adds them up', async () => {
    await renderSuspended(Cost, { props: { job: jobWith({}) } });

    expect(screen.getByText('84,50 €')).toBeTruthy();
    expect(screen.getByText('7,90 €')).toBeTruthy();
    expect(screen.getByText('92,40 €')).toBeTruthy();
  });

  it('says nothing at all while the run has reported no amount', async () => {
    await renderSuspended(Cost, { props: { job: jobWith({ productsCents: undefined }) } });

    expect(screen.queryByText(/ce que ça coûte/i)).toBeNull();
  });

  it('warns when the basket went over the threshold', async () => {
    await renderSuspended(Cost, {
      props: { job: jobWith({ productsCents: 13000, overThreshold: true }) },
    });

    expect(screen.getByText(/au-dessus de ton seuil/i)).toBeTruthy();
  });

  it('says a basket under the order minimum cannot be ordered, and by how much', async () => {
    await renderSuspended(Cost, {
      props: { job: jobWith({ productsCents: 3200, shortOfMinimumCents: 2800 }) },
    });

    expect(screen.getByText(/sous le minimum de commande/i)).toBeTruthy();
    expect(screen.getByText('28,00 €')).toBeTruthy();
  });

  it('puts the blocking problem before the advisory one', async () => {
    await renderSuspended(Cost, {
      props: { job: jobWith({ shortOfMinimumCents: 2800, overThreshold: true }) },
    });

    expect(screen.getByText(/sous le minimum de commande/i)).toBeTruthy();
    expect(screen.queryByText(/au-dessus de ton seuil/i)).toBeNull();
  });
});
