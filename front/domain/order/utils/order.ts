import type { Food } from '../../menu/types/menu.type';

export type OrderLine = {
  food: Food;
  needed: number;
  inStock: number;
  quantity: number;
  kind: 'pack' | 'piece' | 'weight';
  pack?: number;
  price: number;
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

const priceOf = (food: Food, grams: number): number => round2((food.pricePerKg * grams) / 1000);

// One food's line: what stays after the pantry, rounded up to whole packs or
// pieces when that is how it is sold, priced on the grammes actually needed.
export const orderLine = (
  food: Food,
  need: number,
  stock: Record<string, number>,
  packs: Record<string, number | undefined>,
): OrderLine | undefined => {
  const inStock = Math.round(stock[food.id] ?? 0);
  const needed = Math.max(0, Math.round(need) - inStock);
  if (needed === 0) return undefined;

  const base = { food, needed, inStock, price: priceOf(food, needed) };
  const pack = packs[food.id];
  if (pack !== undefined) return { ...base, quantity: Math.ceil(needed / pack), kind: 'pack', pack };
  if (food.pieceWeight !== undefined) {
    return { ...base, quantity: Math.ceil(needed / food.pieceWeight), kind: 'piece' };
  }
  return { ...base, quantity: needed, kind: 'weight' };
};

export const describeOrderLine = (line: OrderLine): string => {
  const need = line.inStock
    ? `${line.needed} ${line.food.unit}, ${line.inStock} deja en stock`
    : `${line.needed} ${line.food.unit}`;
  if (line.kind === 'pack') return `${line.quantity} x ${line.pack} ${line.food.unit} (besoin ${need})`;
  if (line.kind === 'piece') return `${line.quantity} piece(s) (besoin ${need})`;
  return `${need} au poids`;
};
