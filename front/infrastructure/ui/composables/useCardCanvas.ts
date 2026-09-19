// The shareable cards drawn across the app — the weekly recap, the monthly
// recap — sit on the same canvas: the same size, the same framed surface, the
// same footer, and the same save-and-share plumbing. Only what fills the frame
// differs, so the frame itself lives here once and every card draws on top.

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
export const CARD_MARGIN = 56;
export const CARD_PAD = 48;

export type CardPalette = {
  canvas: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  textDimmed: string;
  primary: string;
};

export const cardCssVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value === '' ? fallback : value;
};

// Read fresh at draw time, never cached: the same card has to come out right
// whichever mode the reader happens to be in.
export const cardPalette = (): CardPalette => ({
  canvas: cardCssVar('--canvas', '#eaeee3'),
  surface: cardCssVar('--ui-bg', '#ffffff'),
  border: cardCssVar('--ui-border', '#dde1d4'),
  text: cardCssVar('--ui-text', '#4e5443'),
  textMuted: cardCssVar('--ui-text-muted', '#848b73'),
  textDimmed: cardCssVar('--ui-text-dimmed', '#a7ad97'),
  primary: cardCssVar('--ui-primary', '#235030'),
});

export const roundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
};

export const drawCardFrame = (ctx: CanvasRenderingContext2D, palette: CardPalette): void => {
  ctx.fillStyle = palette.canvas;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  roundedRectPath(
    ctx,
    CARD_MARGIN,
    CARD_MARGIN,
    CARD_WIDTH - CARD_MARGIN * 2,
    CARD_HEIGHT - CARD_MARGIN * 2,
    40,
  );
  ctx.fillStyle = palette.surface;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.border;
  ctx.stroke();
};

export const drawCardFooter = (
  ctx: CanvasRenderingContext2D,
  palette: CardPalette,
  footer: string,
): void => {
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.textDimmed;
  ctx.font = '500 24px "Instrument Sans", sans-serif';
  ctx.fillText(footer, CARD_WIDTH / 2, CARD_HEIGHT - CARD_MARGIN - 36);
  ctx.textAlign = 'left';
};

export const waitForFonts = async (): Promise<void> => {
  if (typeof document === 'undefined' || document.fonts === undefined) return;
  await document.fonts.ready.catch((): undefined => undefined);
};

const toPngBlob = (canvas: HTMLCanvasElement): Promise<Blob | undefined> =>
  new Promise((resolve): void => {
    if (typeof canvas.toBlob !== 'function') {
      resolve(undefined);
      return;
    }
    canvas.toBlob((blob): void => resolve(blob ?? undefined), 'image/png');
  });

export const useCardCanvas = (): {
  download: (canvas: HTMLCanvasElement, filename: string) => Promise<void>;
  shareCard: (canvas: HTMLCanvasElement, filename: string) => Promise<boolean>;
  canShareFiles: () => boolean;
} => {
  const download = async (canvas: HTMLCanvasElement, filename: string): Promise<void> => {
    const blob = await toPngBlob(canvas);
    if (blob === undefined) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const canShareFiles = (): boolean =>
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function';

  const shareCard = async (canvas: HTMLCanvasElement, filename: string): Promise<boolean> => {
    if (!canShareFiles()) return false;

    const blob = await toPngBlob(canvas);
    if (blob === undefined) return false;

    const file = new File([blob], filename, { type: 'image/png' });
    if (!navigator.canShare({ files: [file] })) return false;

    // A reader closing the native share sheet throws AbortError: not a
    // failure, just a change of mind, so it is swallowed rather than reported.
    try {
      await navigator.share({ files: [file], title: filename });
      return true;
    } catch {
      return false;
    }
  };

  return { download, shareCard, canShareFiles };
};
