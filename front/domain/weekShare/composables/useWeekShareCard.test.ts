import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('never throws asking to download a card nobody could draw', async () => {
    const { download } = useWeekShareCard();

    await expect(download(canvasNobodyCouldDraw(), 'semaine.png')).resolves.toBeUndefined();
  });

  it('declines to share a card nobody could draw', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      share: vi.fn(),
      canShare: vi.fn(() => true),
    });

    const { shareCard } = useWeekShareCard();

    await expect(shareCard(canvasNobodyCouldDraw(), 'semaine.png')).resolves.toBe(false);

    vi.unstubAllGlobals();
  });

  describe('canvas.toBlob is available', () => {
    beforeEach(() => {
      HTMLCanvasElement.prototype.toBlob = function toBlob(
        callback: (blob: Blob | null) => void,
      ): void {
        callback(new Blob(['fake'], { type: 'image/png' }));
      };
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('shares the drawn card when the browser can', async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        share,
        canShare: vi.fn(() => true),
      });

      const { shareCard } = useWeekShareCard();
      const canvas = document.createElement('canvas');

      await expect(shareCard(canvas, 'semaine.png')).resolves.toBe(true);
      expect(share).toHaveBeenCalledTimes(1);
    });

    it('reports a cancelled share sheet as a decline, not a crash', async () => {
      const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
      vi.stubGlobal('navigator', {
        ...navigator,
        share,
        canShare: vi.fn(() => true),
      });

      const { shareCard } = useWeekShareCard();
      const canvas = document.createElement('canvas');

      await expect(shareCard(canvas, 'semaine.png')).resolves.toBe(false);
    });
  });
});
