export type MonthlyCardData = {
  wordmark: string;
  title: string;
  weightLabel: string;
  weightValue: string;
  adherenceLabel: string;
  adherenceValue: string;
  budgetLabel: string;
  budgetValue: string;
  dishesLabel: string;
  dishNames: string[];
  footer: string;
};

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const MARGIN = 56;
const PAD = 48;
const STAT_HEIGHT = 150;
const STAT_GAP = 24;

type Palette = {
  canvas: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  textDimmed: string;
  primary: string;
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

const drawHeader = (
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  data: MonthlyCardData,
): void => {
  ctx.textAlign = 'left';

  ctx.fillStyle = palette.primary;
  ctx.font = '600 28px "Instrument Sans", sans-serif';
  ctx.fillText(data.wordmark, MARGIN + PAD, MARGIN + 90);

  ctx.fillStyle = palette.text;
  ctx.font = '400 56px "Instrument Serif", serif';
  ctx.fillText(data.title, MARGIN + PAD, MARGIN + 160);
};

const drawStatRow = (
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  y: number,
  label: string,
  value: string,
): void => {
  const x = MARGIN + PAD;
  const width = CARD_WIDTH - MARGIN * 2 - PAD * 2;

  roundedRectPath(ctx, x, y, width, STAT_HEIGHT, 24);
  ctx.fillStyle = palette.canvas;
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = palette.textMuted;
  ctx.font = '500 26px "Instrument Sans", sans-serif';
  ctx.fillText(label, x + 32, y + 52);

  ctx.fillStyle = palette.text;
  ctx.font = '700 52px "Instrument Sans", sans-serif';
  ctx.fillText(value, x + 32, y + 116);
};

const drawStats = (
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  data: MonthlyCardData,
): number => {
  const rows: [string, string][] = [
    [data.weightLabel, data.weightValue],
    [data.adherenceLabel, data.adherenceValue],
    [data.budgetLabel, data.budgetValue],
  ];

  let y = MARGIN + 210;
  for (const [label, value] of rows) {
    drawStatRow(ctx, palette, y, label, value);
    y += STAT_HEIGHT + STAT_GAP;
  }

  return y;
};

const DISH_LINE_HEIGHT = 44;

const drawDishes = (
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  data: MonthlyCardData,
  startY: number,
): void => {
  if (data.dishNames.length === 0) return;

  const x = MARGIN + PAD;

  ctx.textAlign = 'left';
  ctx.fillStyle = palette.textMuted;
  ctx.font = '500 24px "Instrument Sans", sans-serif';
  ctx.fillText(data.dishesLabel, x, startY);

  ctx.fillStyle = palette.text;
  ctx.font = '600 30px "Instrument Sans", sans-serif';
  data.dishNames.forEach((name, index): void => {
    ctx.fillText(`· ${name}`, x, startY + DISH_LINE_HEIGHT * (index + 1));
  });
};

const drawFooter = (
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  data: MonthlyCardData,
): void => {
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

// The picture half of the monthly recap. Saving and sharing the picture once
// drawn is generic canvas plumbing already built for the weekly card — see
// useWeekShareCard for download/shareCard/canShareFiles, reused as is.
export const useMonthlyRecapCard = (): {
  draw: (canvas: HTMLCanvasElement, data: MonthlyCardData) => Promise<void>;
} => ({
  draw: async (canvas: HTMLCanvasElement, data: MonthlyCardData): Promise<void> => {
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return;

    await waitForFonts();

    const palette = paletteNow();
    drawBackground(ctx, palette);
    drawHeader(ctx, palette, data);
    const dishesY = drawStats(ctx, palette, data);
    drawDishes(ctx, palette, data, dishesY);
    drawFooter(ctx, palette, data);
  },
});
