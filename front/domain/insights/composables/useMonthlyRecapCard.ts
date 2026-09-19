import {
  CARD_HEIGHT,
  CARD_MARGIN as MARGIN,
  CARD_PAD as PAD,
  CARD_WIDTH,
  cardPalette,
  drawCardFooter,
  drawCardFrame,
  roundedRectPath,
  useCardCanvas,
  waitForFonts,
  type CardPalette,
} from '../../../infrastructure/ui/composables/useCardCanvas';

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

const STAT_HEIGHT = 150;
const STAT_GAP = 24;

const drawHeader = (
  ctx: CanvasRenderingContext2D,
  palette: CardPalette,
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
  palette: CardPalette,
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
  palette: CardPalette,
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
  palette: CardPalette,
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

export const useMonthlyRecapCard = (): {
  draw: (canvas: HTMLCanvasElement, data: MonthlyCardData) => Promise<void>;
  download: (canvas: HTMLCanvasElement, filename: string) => Promise<void>;
  shareCard: (canvas: HTMLCanvasElement, filename: string) => Promise<boolean>;
  canShareFiles: () => boolean;
} => {
  const draw = async (canvas: HTMLCanvasElement, data: MonthlyCardData): Promise<void> => {
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return;

    await waitForFonts();

    const palette = cardPalette();
    drawCardFrame(ctx, palette);
    drawHeader(ctx, palette, data);
    const dishesY = drawStats(ctx, palette, data);
    drawDishes(ctx, palette, data, dishesY);
    drawCardFooter(ctx, palette, data.footer);
  };

  return { draw, ...useCardCanvas() };
};
