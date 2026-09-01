import { describe, expect, it } from 'vitest';

describe('useEquipmentList', () => {
  it('counts one cooking vessel per dish and one box per container', () => {
    const { itemsOf } = useEquipmentList();

    const items = itemsOf(3, 11);

    expect(items.find((item): boolean => item.id === 'cookingVessel')?.count).toBe(3);
    expect(items.find((item): boolean => item.id === 'container')?.count).toBe(11);
  });

  it('always lists the baseline tools, uncounted', () => {
    const { itemsOf } = useEquipmentList();

    const knife = itemsOf(0, 0).find((item): boolean => item.id === 'knife');

    expect(knife?.count).toBeUndefined();
  });
});
