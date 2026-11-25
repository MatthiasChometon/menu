import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PushToggle from './PushToggle.vue';

const { subscribe, refresh } = vi.hoisted(() => ({ subscribe: vi.fn(), refresh: vi.fn() }));

type PushApi = ReturnType<typeof import('../composables/useGroceryPush').useGroceryPush>;

mockNuxtImport('useGroceryPush', () => (): PushApi => ({
  isSupported: ref(true),
  isSubscribed: ref(false),
  isBlocked: ref(false),
  isWorking: ref(false),
  refresh,
  subscribe,
  unsubscribe: vi.fn(),
}));

beforeEach(async (): Promise<void> => {
  subscribe.mockReset();
  refresh.mockReset();
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('the push notifications toggle', () => {
  it('says so when the browser refuses the subscription', async () => {
    subscribe.mockRejectedValue(new Error('refused'));
    await renderSuspended(PushToggle);

    await fireEvent.click(screen.getByRole('button', { name: /activer les notifications/i }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/notifications/i);
  });

  it('shows no alert when the subscription goes through', async () => {
    subscribe.mockResolvedValue(undefined);
    await renderSuspended(PushToggle);

    await fireEvent.click(screen.getByRole('button', { name: /activer les notifications/i }));

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
