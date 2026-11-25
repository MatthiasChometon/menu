import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Button from './Button.vue';

// The paired-browser list is what the card reacts to; it is set per test rather
// than fetched, so what is under test is what the card says, not the network.
const { deviceState, refreshDevices, orderState } = vi.hoisted(() => ({
  orderState: { failed: false },
  deviceState: { list: [] as { id: string }[] },
  refreshDevices: vi.fn(),
}));

type DevicesApi = ReturnType<typeof import('../composables/useGroceryDevices').useGroceryDevices>;

mockNuxtImport('useGroceryDevices', () => (): DevicesApi => ({
  devices: ref(deviceState.list) as DevicesApi['devices'],
  refresh: refreshDevices,
  isPairing: ref(false),
  freshToken: ref(undefined),
  pair: vi.fn(),
  unpair: vi.fn(),
  forgetToken: vi.fn(),
}));

type OrderApi = ReturnType<typeof import('../composables/useGroceryOrder').useGroceryOrder>;

mockNuxtImport('useGroceryOrder', () => (): OrderApi => ({
  job: ref(undefined),
  isQueueing: ref(false),
  isRunning: computed((): boolean => false),
  hasFailed: ref(orderState.failed),
  order: vi.fn(),
  follow: vi.fn(),
  stopFollowing: vi.fn(),
}));

mockNuxtImport(
  'useBasketNeeds',
  () => (): { needsOf: () => { foodId: string; grams: number }[] } => ({
    needsOf: (): { foodId: string; grams: number }[] => [],
  }),
);

const menu = { weekOf: '2026-08-24' } as unknown as Menu;

beforeEach(async (): Promise<void> => {
  refreshDevices.mockReset();
  orderState.failed = false;
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('the Carrefour order card', () => {
  it('always points to where a browser is set up', async () => {
    deviceState.list = [{ id: 'a' }];
    await renderSuspended(Button, { props: { menu } });

    const link = screen.getByRole('link', { name: /configurer un navigateur/i });
    expect(link.getAttribute('href')).toContain('courses-auto');
  });

  it('explains, before the button is even pressed, why nothing fills without a paired browser', async () => {
    deviceState.list = [];
    await renderSuspended(Button, { props: { menu } });

    // The whole frustration: a run queued with no browser waits forever. The
    // card says so up front rather than leave a spinner to explain it.
    expect(await screen.findByText(/aucun navigateur appairé/i)).toBeTruthy();
  });

  it('drops the warning once a browser is paired', async () => {
    deviceState.list = [{ id: 'living-room' }];
    await renderSuspended(Button, { props: { menu } });
    await nextTick();

    expect(screen.queryByText(/aucun navigateur appairé/i)).toBeNull();
  });

  it('says the browsers could not be loaded, rather than claiming none is paired', async () => {
    deviceState.list = [];
    refreshDevices.mockRejectedValue(new Error('network down'));
    await renderSuspended(Button, { props: { menu } });

    expect((await screen.findByRole('alert')).textContent).toMatch(/navigateurs appairés/i);
    expect(screen.queryByText(/aucun navigateur appairé/i)).toBeNull();
  });

  it('says the run did not leave when the order could not be queued', async () => {
    deviceState.list = [{ id: 'a' }];
    orderState.failed = true;
    await renderSuspended(Button, { props: { menu } });

    expect((await screen.findByRole('alert')).textContent).toMatch(/la demande n.est pas partie/i);
  });
});
