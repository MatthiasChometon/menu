import { renderSuspended } from '@nuxt/test-utils/runtime';
import { screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it } from 'vitest';
import Progress from './Progress.vue';
import type { GroceryJob } from '../composables/useGroceryOrder';

const jobWith = (overrides: Record<string, unknown>): GroceryJob =>
  ({
    id: 'job-1',
    weekOf: '2026-08-24',
    status: 'RUNNING',
    finishedAt: undefined,
    events: [],
    lines: [
      { foodId: 'brownRice', units: 2, productName: 'Riz complet' },
      { foodId: 'oats', units: 1, productName: 'Flocons' },
    ],
    ...overrides,
  }) as GroceryJob;

const event = (kind: string, overrides: object = {}): GroceryJob['events'][number] =>
  ({
    id: `e-${kind}`,
    kind,
    at: '2026-08-24T10:00:00Z',
    ...overrides,
  }) as GroceryJob['events'][number];

// The i18n locale is shared across the test app, so each file pins the one it
// asserts on instead of inheriting whatever ran before.
beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('following a run', () => {
  it('says a queued run is waiting for a browser, and why', async () => {
    await renderSuspended(Progress, { props: { job: jobWith({ status: 'PENDING' }) } });

    expect(screen.getByText(/en attente d'un navigateur/i)).toBeTruthy();
    expect(screen.getByText(/ouvre chrome sur un poste appairé/i)).toBeTruthy();
  });

  it('counts what is already in the basket', async () => {
    await renderSuspended(Progress, {
      props: { job: jobWith({ events: [event('LINE_ADDED'), event('LINE_ADDED2')] }) },
    });

    expect(screen.getByText(/1 \/ 2/)).toBeTruthy();
  });

  it('puts what the run could not buy in front of the reader', async () => {
    await renderSuspended(Progress, {
      props: {
        job: jobWith({
          events: [
            event('LINE_MISSING', {
              label: 'Lait entier',
              detail: 'Demandé 2, le magasin en a donné 1.',
            }),
          ],
        }),
      },
    });

    expect(screen.getByText('Lait entier')).toBeTruthy();
    expect(screen.getByText(/le magasin en a donné 1/i)).toBeTruthy();
  });

  it('stays quiet about shortfalls when there are none', async () => {
    await renderSuspended(Progress, {
      props: { job: jobWith({ status: 'SUCCEEDED', events: [event('LINE_ADDED')] }) },
    });

    expect(screen.queryByText(/à regarder/i)).toBeNull();
    expect(screen.getByText(/panier prêt/i)).toBeTruthy();
  });
});
