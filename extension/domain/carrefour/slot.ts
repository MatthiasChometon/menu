import type { DeliverySlot, SlotWindow } from './type';

// The shop's windows are wall-clock times in France, whatever zone the browser
// or the test runner is in.
const SHOP_CLOCK = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const ISO_WEEKDAY: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

const shopTimeOf = (date: Date): { weekday: number; minute: number } => {
  const part = (type: string): string =>
    SHOP_CLOCK.formatToParts(date).find((item): boolean => item.type === type)?.value ?? '';
  return {
    weekday: ISO_WEEKDAY[part('weekday')] ?? 0,
    minute: Number(part('hour')) * 60 + Number(part('minute')),
  };
};

const fits = (slot: DeliverySlot, windows: SlotWindow[]): boolean => {
  const begin = new Date(slot.begin);
  if (Number.isNaN(begin.getTime())) return false;

  const { weekday, minute } = shopTimeOf(begin);

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
  if (windows.length === 0) return undefined;

  return slots
    .filter((slot): boolean => slot.available)
    .filter((slot): boolean => stillOrderable(slot, now))
    .filter((slot): boolean => fits(slot, windows))
    .sort(
      (left, right): number => new Date(left.begin).getTime() - new Date(right.begin).getTime(),
    )[0];
};
