import type { WeekShareData } from '../types/share.type';

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const MARGIN = 56;
const PAD = 48;

type EnergyKey = 'protein' | 'carbs' | 'fat';
const energyKeys: readonly EnergyKey[] = ['protein', 'carbs', 'fat'];

type Palette = {
  canvas: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  textDimmed: string;
  primary: string;
  energy: Record<EnergyKey, string>;
};

const energyOf = (macros: Macros): Record<EnergyKey, number> & { total: number } => {
  const protein = macros.protein * 4;
  const carbs = macros.carbs * 4;
  const fat = macros.fat * 9;
  const total = protein + carbs + fat;
  return { protein, carbs, fat, total: total === 0 ? 1 : total };
};

const cssVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value === '' ? fallback : value;
};

// Read fresh at draw time, never cached: the same card has to come out right
// whichever mode the reader happens to be in.
const paletteNow = (): Palette => ({
  canvas: cssVar('--canvas', '#eaeee3'),
  surface: cssVar('--ui-bg', '#ffffff'),
  border: cssVar('--ui-border', '#dde1d4'),
  text: cssVar('--ui-text', '#4e5443'),
  textMuted: cssVar('--ui-text-muted', '#848b73'),
  textDimmed: cssVar('--ui-text-dimmed', '#a7ad97'),
  primary: cssVar('--ui-primary', '#235030'),
  energy: {
    protein: cssVar('--macro-protein', '#2b683c'),
    carbs: cssVar('--macro-carbs', '#9a7212'),
    fat: cssVar('--macro-fat', '#a84e2b'),
  },
});

const roundedRectPath = (
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

const drawBackground = (ctx: CanvasRenderingContext2D, palette: Palette): void => {
  ctx.fillStyle = palette.canvas;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  roundedRectPath(ctx, MARGIN, MARGIN, CARD_WIDTH - MARGIN * 2, CARD_HEIGHT - MARGIN * 2, 40);
  ctx.fillStyle = palette.surface;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.border;
  ctx.stroke();
};

const drawHeader = (ctx: CanvasRenderingContext2D, palette: Palette, data: WeekShareData): void => {
  ctx.textAlign = 'left';

  ctx.fillStyle = palette.primary;
  ctx.font = '600 28px "Instrument Sans", sans-serif';
  ctx.fillText(data.wordmark, MARGIN + PAD, MARGIN + 90);

  ctx.fillStyle = palette.text;
  ctx.font = '400 60px "Instrument Serif", serif';
  ctx.fillText(data.weekLabel, MARGIN + PAD, MARGIN + 168);
};

type DonutLayout = { centerX: number; centerY: number; radius: number };

const donutLayout = (): DonutLayout => ({
  centerX: MARGIN + PAD + 190,
  centerY: MARGIN + 168 + 250,
  radius: 180,
});

const drawDonut = (
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  data: WeekShareData,
): DonutLayout => {
  const layout = donutLayout();
  const lineWidth = 44;
  const energy = energyOf(data.avgMacros);

  ctx.lineCap = 'butt';
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = palette.border;
  ctx.beginPath();
  ctx.arc(layout.centerX, layout.centerY, layout.radius, 0, Math.PI * 2);
  ctx.stroke();

  let start = -Math.PI / 2;
  for (const key of energyKeys) {
    const end = start + (energy[key] / energy.total) * Math.PI * 2;
    ctx.strokeStyle = palette.energy[key];
    ctx.beginPath();
    ctx.arc(layout.centerX, layout.centerY, layout.radius, start, end);
    ctx.stroke();
    start = end;
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = palette.text;
  ctx.font = '700 68px "Instrument Sans", sans-serif';
  ctx.fillText(String(Math.round(data.avgKcal)), layout.centerX, layout.centerY + 16);
  ctx.fillStyle = palette.textDimmed;
  ctx.font = '500 26px "Instrument Sans", sans-serif';
  ctx.fillText(data.kcalUnitLabel, layout.centerX, layout.centerY + 56);
  ctx.textAlign = 'left';

  return layout;
};

const drawMacroRows = (
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  data: WeekShareData,
  donut: DonutLayout,
): void => {
  const startX = donut.centerX + donut.radius + 70;
  const grams: Record<EnergyKey, number> = {
    protein: data.avgMacros.protein,
    carbs: data.avgMacros.carbs,
    fat: data.avgMacros.fat,
  };
  const energy = energyOf(data.avgMacros);

  let y = donut.centerY - 84;
  for (const key of energyKeys) {
    const share = Math.round((energy[key] / energy.total) * 100);

    ctx.fillStyle = palette.energy[key];
    ctx.beginPath();
    ctx.arc(startX + 12, y - 10, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.text;
    ctx.font = '600 32px "Instrument Sans", sans-serif';
    ctx.fillText(data.macroLabels[key], startX + 40, y);

    ctx.fillStyle = palette.textMuted;
    ctx.font = '400 28px "Instrument Sans", sans-serif';
    ctx.fillText(`${Math.round(grams[key])} g · ${share}%`, startX + 40, y + 36);

    y += 96;
  }
};

const statTilesY = (): number => donutLayout().centerY + donutLayout().radius + 90;

const drawStat = (
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  x: number,
  width: number,
  label: string,
  value: string,
): void => {
  const y = statTilesY();

  roundedRectPath(ctx, x, y, width, 130, 24);
  ctx.fillStyle = palette.canvas;
  ctx.fill();

  ctx.fillStyle = palette.textMuted;
  ctx.font = '500 24px "Instrument Sans", sans-serif';
  ctx.fillText(label, x + 28, y + 46);

  ctx.fillStyle = palette.text;
  ctx.font = '700 44px "Instrument Sans", sans-serif';
  ctx.fillText(value, x + 28, y + 100);
};

const drawStats = (ctx: CanvasRenderingContext2D, palette: Palette, data: WeekShareData): void => {
  const gap = 24;
  const width = (CARD_WIDTH - MARGIN * 2 - PAD * 2 - gap) / 2;
  const x1 = MARGIN + PAD;
  const x2 = x1 + width + gap;

  drawStat(ctx, palette, x1, width, data.budgetLabel, `${Math.round(data.totalPrice)} €`);
  drawStat(ctx, palette, x2, width, data.recipesLabel, String(data.recipeCount));
};

const drawFooter = (ctx: CanvasRenderingContext2D, palette: Palette, data: WeekShareData): void => {
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.textDimmed;
  ctx.font = '500 24px "Instrument Sans", sans-serif';
  ctx.fillText(data.footer, CARD_WIDTH / 2, CARD_HEIGHT - MARGIN - 36);
  ctx.textAlign = 'left';
};

const waitForFonts = async (): Promise<void> => {
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

export const useWeekShareCard = (): {
  draw: (canvas: HTMLCanvasElement, data: WeekShareData) => Promise<void>;
  download: (canvas: HTMLCanvasElement, filename: string) => Promise<void>;
  shareCard: (canvas: HTMLCanvasElement, filename: string) => Promise<boolean>;
  canShareFiles: () => boolean;
} => {
  const draw = async (canvas: HTMLCanvasElement, data: WeekShareData): Promise<void> => {
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return;

    await waitForFonts();

    const palette = paletteNow();
    drawBackground(ctx, palette);
    drawHeader(ctx, palette, data);
    const donut = drawDonut(ctx, palette, data);
    drawMacroRows(ctx, palette, data, donut);
    drawStats(ctx, palette, data);
    drawFooter(ctx, palette, data);
  };

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

  return { draw, download, shareCard, canShareFiles };
};
