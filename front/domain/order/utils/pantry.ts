import type { Food } from '../../menu/types/menu.type';

// What does not keep from one week to the next: no point counting leftover
// salmon or salad as stock.
const PERISHABLE_AISLES = new Set<Food['aisle']>(['butcher', 'produce']);
const PERISHABLE_IDS = new Set(['skyr', 'quark', 'egg', 'wholeMilk', 'semiSkimmedMilk', 'hardCheese']);

export const keeps = (food: Food): boolean =>
  !PERISHABLE_IDS.has(food.id) && !PERISHABLE_AISLES.has(food.aisle);

// Whole packs are bought but only the need is used, so the surplus carries over.
export const leftover = (previous: number, purchased: number, need: number): number =>
  Math.max(0, Math.round(previous + purchased - need));
