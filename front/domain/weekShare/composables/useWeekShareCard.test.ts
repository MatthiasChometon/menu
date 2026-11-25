import { describe, expect, it, vi } from 'vitest';

const sampleData = (): WeekShareData => ({
  wordmark: 'LE MENU',
  weekLabel: 'Semaine du 1 septembre',
  avgKcal: 3100,
  kcalUnitLabel: 'kcal',
  avgMacros: { kcal: 3100, protein: 165, carbs: 440, fat: 80, fiber: 55 },
  macroLabels: { protein: 'Prot.', carbs: 'Gluc.', fat: 'Lip.' },
  totalPrice: 62,
  budgetLabel: 'Budget',
  recipeCount: 5,
  recipesLabel: 'Recettes',
  footer: 'menu.mtxlab.xyz',
});

// The test environment's own canvas stub answers toBlob with something that
// is not quite a real Blob across realms — standing in here for a canvas that
// genuinely could not be captured (context creation failed, browser support
// missing…), which is the case the guard in the composable exists for.
const canvasNobodyCouldDraw = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'toBlob', { value: undefined, configurable: true });
  return canvas;
};

describe('useWeekShareCard', () => {
  it('draws without throwing even when the test environment has no 2D canvas context', async () => {
    const { draw } = useWeekShareCard();
    const canvas = document.createElement('canvas');

    await expect(draw(canvas, sampleData())).resolves.toBeUndefined();
  });

  it('reports no share support when the browser lacks the Web Share API', () => {
    const { canShareFiles } = useWeekShareCard();

    expect(canShareFiles()).toBe(false);
  });

  it('reports share support once the Web Share API is available', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      share: vi.fn(),
      canShare: vi.fn(() => true),
    });

    const { canShareFiles } = useWeekShareCard();

    expect(canShareFiles()).toBe(true);

    vi.unstubAllGlobals();
  });

  // The week dialog depends on these two: without them on the facade it would
  // call undefined instead of showing its failure message.
  it('refuses, rather than staying silent, to download a card nobody could draw', async () => {
    const { downloadOrFail } = useWeekShareCard();

    await expect(downloadOrFail(canvasNobodyCouldDraw(), 'semaine.png')).rejects.toThrow();
  });

  it('refuses, rather than staying silent, to share a card nobody could draw', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      share: vi.fn(),
      canShare: vi.fn(() => true),
    });
    const { shareOrFail } = useWeekShareCard();

    await expect(shareOrFail(canvasNobodyCouldDraw(), 'semaine.png')).rejects.toThrow();

    vi.unstubAllGlobals();
  });
});
