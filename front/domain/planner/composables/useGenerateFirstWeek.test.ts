import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  generateWeek,
  save,
  isGenerating,
  saveFailed,
  plannerWeek,
  user,
  selectedWeek,
  navigate,
  refresh,
} = vi.hoisted(() => ({
  generateWeek: vi.fn(async (): Promise<void> => {}),
  save: vi.fn(async (): Promise<void> => {}),
  isGenerating: { value: false },
  saveFailed: { value: false },
  plannerWeek: { value: '2026-09-07' },
  user: { value: undefined as { id: string } | undefined },
  selectedWeek: { value: '' },
  navigate: vi.fn(async (): Promise<void> => {}),
  refresh: vi.fn(async (): Promise<void> => {}),
}));

type PlannerStub = {
  generateWeek: typeof generateWeek;
  isGenerating: typeof isGenerating;
  save: typeof save;
  saveFailed: typeof saveFailed;
};

mockNuxtImport('usePlanner', () => (): PlannerStub => ({
  generateWeek,
  isGenerating,
  save,
  saveFailed,
}));
mockNuxtImport('usePlannerWeek', () => (): { week: typeof plannerWeek } => ({ week: plannerWeek }));
mockNuxtImport('useAuth', () => (): { user: typeof user } => ({ user }));
mockNuxtImport('useSelectedWeek', () => (): { selectedWeek: typeof selectedWeek } => ({
  selectedWeek,
}));
mockNuxtImport(
  'useLocalePath',
  () =>
    (): ((path: string) => string) =>
    (path: string): string =>
      path,
);
mockNuxtImport('navigateTo', () => navigate);
mockNuxtImport('refreshNuxtData', () => refresh);

describe('generating a first week from anywhere in the app', () => {
  beforeEach((): void => {
    generateWeek.mockClear();
    save.mockClear();
    navigate.mockClear();
    refresh.mockClear();
    saveFailed.value = false;
    user.value = undefined;
    selectedWeek.value = '';
  });

  it('sends a signed-out reader to the composer to review it, without trying to save', async () => {
    const { generate } = useGenerateFirstWeek();

    await generate();

    expect(generateWeek).toHaveBeenCalledOnce();
    expect(save).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/composer');
  });

  it('saves and lands a signed-in reader on their new week', async () => {
    user.value = { id: 'someone' };
    const { generate } = useGenerateFirstWeek();

    await generate();

    expect(save).toHaveBeenCalledOnce();
    expect(selectedWeek.value).toBe(plannerWeek.value);
    // Generating from the current week moves nothing on its own, so the saved
    // week only shows if the cached menu is refetched in place before landing.
    expect(refresh).toHaveBeenCalledWith('menu:shown');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('stays put when the save fails, leaving the error visible', async () => {
    user.value = { id: 'someone' };
    saveFailed.value = true;
    const { generate } = useGenerateFirstWeek();

    await generate();

    expect(refresh).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
