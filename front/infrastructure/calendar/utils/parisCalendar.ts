export const DAY_MS = 24 * 60 * 60 * 1000;

// The household eats in France: "today" is the calendar day in Paris, whatever
// the zone of the device or of the server that renders the page. A day is then
// handled as a plain 'YYYY-MM-DD' string, and its arithmetic runs on UTC midnights,
// which have no daylight-saving hour to trip over.
const PARIS_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const PARIS_CLOCK = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export const utcMidnightOf = (day: string): number => Date.parse(`${day}T00:00:00Z`);

export const parisDayOf = (instant: Date): string => PARIS_DAY.format(instant);

/** Minutes elapsed since midnight on the Paris clock, whatever the zone of the device. */
export const parisMinutesOf = (instant: Date): number => {
  const parts = PARIS_CLOCK.formatToParts(instant);
  const part = (type: string): number =>
    Number(parts.find((entry): boolean => entry.type === type)?.value);

  return part('hour') * 60 + part('minute');
};

/** A 'YYYY-MM-DD' day moved by whole days, on the Paris calendar: no device-zone
 *  or daylight-saving hour is ever involved. */
export const shiftedBy = (day: string, days: number): string =>
  new Date(utcMidnightOf(day) + days * DAY_MS).toISOString().slice(0, 10);

/** Whole weeks from one 'YYYY-MM-DD' day to another, rounded. */
export const weeksBetween = (from: string, to: string): number =>
  Math.round((utcMidnightOf(to) - utcMidnightOf(from)) / (7 * DAY_MS));

/** The day a window starts on, as the Paris calendar day of the instant given,
 *  shifted by whole weeks. No longer snapped to Monday: a window runs from today,
 *  so it never plans a day that has already passed. */
export const startOf = (day: Date, weeks = 0): string => shiftedBy(parisDayOf(day), weeks * 7);
