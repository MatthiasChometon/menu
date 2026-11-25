import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './index.vue';

// A signed-in reader whose own week has to be fetched: the example week is out of
// the picture, so what the page shows follows menuFor alone.
const { menuFor } = vi.hoisted(() => ({
  menuFor: vi.fn<(weekOf: string) => Promise<undefined>>(),
}));

mockNuxtImport('useComposedMenu', () => (): { menuFor: typeof menuFor } => ({ menuFor }));
mockNuxtImport('useAuth', () => (): object => ({
  user: ref({ id: 'reader' }),
  isLoading: computed((): boolean => false),
  refresh: vi.fn(),
  signOut: vi.fn(),
}));
mockNuxtImport('useProfile', () => (): object => ({
  profile: ref({ targets: { kcal: 3000, protein: 165, fat: 80, carbs: 445, fiber: 30 } }),
  isLoading: computed((): boolean => false),
  hasAnswered: computed((): boolean => true),
  refresh: vi.fn(),
  save: vi.fn(),
  adjustTargets: vi.fn(),
}));

afterEach((): void => {
  vi.useRealTimers();
});

beforeEach((): void => {
  menuFor.mockReset();
  clearNuxtData('menu:shown');
  clearNuxtState(['menu:selectedWeek', 'menu:now']);
});

const failure = (): HTMLElement | null => screen.queryByText('Impossible de charger ta semaine');

describe('the home page of a signed-in reader', () => {
  it('tells the reader when the week could not be loaded, instead of offering to compose one', async () => {
    menuFor.mockRejectedValue(new Error('offline'));

    await renderSuspended(Page);

    const title = await screen.findByText('Impossible de charger ta semaine');
    expect(title.closest('[role="alert"]')).not.toBeNull();
    expect(screen.queryByText("Cette semaine n'est pas encore composée")).toBeNull();
  });

  it('fetches the week again, once, when the reader retries', async () => {
    menuFor.mockRejectedValue(new Error('offline'));

    await renderSuspended(Page);
    const retry = await screen.findByRole('button', { name: 'Réessayer' });
    const callsBefore = menuFor.mock.calls.length;
    menuFor.mockResolvedValue(undefined);
    await fireEvent.click(retry);

    await waitFor((): void => expect(failure()).toBeNull());
    expect(menuFor.mock.calls.length - callsBefore).toBe(1);
  });

  it('does not ask for the week over and over while it keeps failing', async () => {
    // Time moves on its own, so the page can render, and by hand for the wait.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    menuFor.mockRejectedValue(new Error('offline'));

    await renderSuspended(Page);
    await screen.findByText('Impossible de charger ta semaine');
    const settled = menuFor.mock.calls.length;
    await vi.advanceTimersByTimeAsync(500);

    expect(menuFor.mock.calls.length).toBe(settled);
  });

  it('holds a loading state while the week is on its way', async () => {
    menuFor.mockReturnValue(new Promise<undefined>(() => undefined));

    await renderSuspended(Page);

    expect(await screen.findByText('Chargement en cours')).toBeTruthy();
    expect(failure()).toBeNull();
  });
});
