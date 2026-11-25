import { describe, expect, it } from 'vitest';
import { orderLine } from '../composables/orderLines';
import { describeOrderLine } from './describeOrderLine';
import type { Food } from '../../menu/types/menu.type';

const rice = { id: 'rice', unit: 'g', pricePerKg: 0 } as unknown as Food;

describe('describeOrderLine', () => {
  it('reads a pack line with its need', () => {
    const line = orderLine(rice, 960, {}, { rice: 1000 });

    expect(line).toBeDefined();
    expect(describeOrderLine(line as NonNullable<typeof line>)).toBe('1 x 1000 g (besoin 960 g)');
  });
});
