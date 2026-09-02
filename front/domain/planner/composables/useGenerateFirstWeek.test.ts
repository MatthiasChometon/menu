import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateWeek, save, isGenerating, saveFailed, plannerWeek, user, selectedWeek, navigate } =
  vi.hoisted(() => ({
    generateWeek: vi.fn(async (): Promise<void> => {}),
    save: vi.fn(async (): Promise<void> => {}),
    isGenerating: { value: false },
    saveFailed: { value: false },
    plannerWeek: { value: '2026-09-07' },
    user: { value: undefined as { id: string } | undefined },
    selectedWeek: { value: '' },
    navigate: vi.fn(async (): Promise<void> => {}),
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

describe('generating a first week from anywhere in the app', () => {
  beforeEach((): void => {
    generateWeek.mockClear();
    save.mockClear();
    navigate.mockClear();
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
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('stays put when the save fails, leaving the error visible', async () => {
    user.value = { id: 'someone' };
    saveFailed.value = true;
    const { generate } = useGenerateFirstWeek();

    await generate();

    expect(navigate).not.toHaveBeenCalled();
  });
});
