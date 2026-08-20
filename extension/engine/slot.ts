import { DeliverySlot } from '../carrefour/type';

export type SlotWindow = {
  /** 1 is Monday, 7 is Sunday, as ISO 8601 numbers them. */
  weekday: number;
  startMinute: number;
  endMinute: number;
};

const minutesOf = (date: Date): number => date.getHours() * 60 + date.getMinutes();

// ISO counts Sunday as 7; getDay returns 0 for it.
const weekdayOf = (date: Date): number => (date.getDay() === 0 ? 7 : date.getDay());

const fits = (slot: DeliverySlot, windows: SlotWindow[]): boolean => {
  const begin = new Date(slot.begin);
  if (Number.isNaN(begin.getTime())) {
    return false;
  }

  const weekday = weekdayOf(begin);
  const minute = minutesOf(begin);

  return windows.some(
    (window): boolean =>
      window.weekday === weekday && minute >= window.startMinute && minute <= window.endMinute,
  );
};

// A slot whose cutoff has passed is worthless: the shop will not take an order
// for it, however available it still looks.
const stillOrderable = (slot: DeliverySlot, now: Date): boolean =>
  slot.cutoff === undefined || new Date(slot.cutoff).getTime() > now.getTime();

export const chooseSlot = (
  slots: DeliverySlot[],
  windows: SlotWindow[],
  now: Date,
): DeliverySlot | undefined => {
  // No window means no slot is acceptable, so none is taken and the report
  // lists what was on offer instead.
  if (windows.length === 0) {
    return undefined;
  }

  return slots
    .filter((slot): boolean => slot.available)
    .filter((slot): boolean => stillOrderable(slot, now))
    .filter((slot): boolean => fits(slot, windows))
    .sort(
      (left, right): number => new Date(left.begin).getTime() - new Date(right.begin).getTime(),
    )[0];
};
