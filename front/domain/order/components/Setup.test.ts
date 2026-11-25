import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Setup from './Setup.vue';

const { refresh, pair } = vi.hoisted(() => ({ refresh: vi.fn(), pair: vi.fn() }));

type DevicesApi = ReturnType<typeof import('../composables/useGroceryDevices').useGroceryDevices>;
type BridgeApi = ReturnType<typeof import('../composables/useExtensionBridge').useExtensionBridge>;

mockNuxtImport('useGroceryDevices', () => (): DevicesApi => ({
  devices: ref([]) as DevicesApi['devices'],
  refresh,
  isPairing: ref(false),
  freshToken: ref(undefined),
  pair,
  unpair: vi.fn(),
  forgetToken: vi.fn(),
}));

mockNuxtImport('useExtensionBridge', () => (): BridgeApi => ({
  extensionHere: ref(true),
  extensionConfigured: ref(false),
  justPaired: ref(false),
  sendPairing: vi.fn(),
  armCarrefourReturn: vi.fn(),
}));

beforeEach(async (): Promise<void> => {
  refresh.mockReset();
  pair.mockReset();
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('the auto-basket setup', () => {
  it('does not pair a new browser when the list of paired browsers failed to load', async () => {
    refresh.mockRejectedValue(new Error('network down'));
    await renderSuspended(Setup);

    // An unreadable list is not an empty one: pairing on it would add a stray
    // device on the account every time the network hiccups.
    await screen.findByRole('alert');
    expect(pair).not.toHaveBeenCalled();
  });

  it('pairs once a retry shows the account really has no browser', async () => {
    refresh.mockRejectedValueOnce(new Error('network down')).mockResolvedValue(undefined);
    pair.mockResolvedValue(undefined);
    await renderSuspended(Setup);

    const alert = await screen.findByRole('alert');
    await fireEvent.click(within(alert).getByRole('button', { name: /réessayer/i }));

    await waitFor((): void => expect(pair).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/navigateurs appairés/i)).toBeNull();
  });

  it('says so when pairing is refused, instead of failing silently', async () => {
    refresh.mockResolvedValue(undefined);
    pair.mockRejectedValue(new Error('refused'));
    await renderSuspended(Setup);

    expect((await screen.findByRole('alert')).textContent).toMatch(/appairage/i);
  });
});
