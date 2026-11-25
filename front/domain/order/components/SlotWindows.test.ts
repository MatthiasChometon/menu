import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SlotWindows from './SlotWindows.vue';

const { save, refresh } = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn() }));

type SlotsApi = ReturnType<typeof import('../composables/useSlotWindows').useSlotWindows>;

mockNuxtImport('useSlotWindows', () => (): SlotsApi => ({
  windows: ref([]),
  isSaving: ref(false),
  refresh,
  save,
}));

beforeEach(async (): Promise<void> => {
  save.mockReset();
  refresh.mockReset();
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('the delivery windows', () => {
  it('says they could not be loaded, hides the form, and loads them on retry', async () => {
    refresh.mockRejectedValueOnce(new Error('network down')).mockResolvedValue(undefined);
    await renderSuspended(SlotWindows);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/moments de livraison/i);
    // Saving the blank form would wipe the real choice.
    expect(screen.queryByRole('button', { name: /^enregistrer$/i })).toBeNull();

    await fireEvent.click(within(alert).getByRole('button', { name: /réessayer/i }));

    expect(await screen.findByRole('button', { name: /^enregistrer$/i })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says so when saving fails', async () => {
    refresh.mockResolvedValue(undefined);
    save.mockRejectedValue(new Error('refused'));
    await renderSuspended(SlotWindows);

    await fireEvent.click(await screen.findByRole('button', { name: /^enregistrer$/i }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/enregistrement/i);
  });
});
