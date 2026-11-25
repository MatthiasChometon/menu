import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './batch.vue';

// A signed-in reader whose own week has to be fetched: what the page shows
// follows menuFor alone.
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

beforeEach((): void => {
  menuFor.mockReset();
  clearNuxtData('menu:shown');
  clearNuxtState(['menu:selectedWeek', 'menu:now']);
});

describe('the batch page of a signed-in reader', () => {
  it('tells the reader when the week could not be loaded, instead of calling it empty', async () => {
    menuFor.mockRejectedValue(new Error('offline'));

    await renderSuspended(Page);

    const title = await screen.findByText('Impossible de charger ta semaine');
    expect(title.closest('[role="alert"]')).not.toBeNull();
  });

  it('fetches the week again, once, when the reader retries', async () => {
    menuFor.mockRejectedValue(new Error('offline'));

    await renderSuspended(Page);
    await screen.findByRole('button', { name: 'Réessayer' });
    // The week is first asked for as the page mounts, then again once today's
    // date is known: let both land so that only the retry is counted.
    await new Promise((resolve): void => void setTimeout(resolve, 300));
    const callsBefore = menuFor.mock.calls.length;
    menuFor.mockResolvedValue(undefined);
    await fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    await waitFor((): void =>
      expect(screen.queryByText('Impossible de charger ta semaine')).toBeNull(),
    );
    expect(menuFor.mock.calls.length - callsBefore).toBe(1);
  });
});
