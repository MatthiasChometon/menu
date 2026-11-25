import type { OrderLine } from '../types/order.type';

// Printed by the command-line order script only, so it is not translated: the
// app itself words these lines through i18n.
export const describeOrderLine = (line: OrderLine): string => {
  const need = line.inStock
    ? `${line.needed} ${line.food.unit}, ${line.inStock} deja en stock`
    : `${line.needed} ${line.food.unit}`;
  if (line.kind === 'pack')
    return `${line.quantity} x ${line.pack} ${line.food.unit} (besoin ${need})`;
  if (line.kind === 'piece') return `${line.quantity} piece(s) (besoin ${need})`;
  return `${need} au poids`;
};
