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
