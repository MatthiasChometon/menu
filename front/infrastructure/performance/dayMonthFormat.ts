// `toLocaleDateString(locale, options)` builds a fresh Intl formatter on every
// call, which is the slow part: a week picker and seven day cards paid for it
// a dozen times during hydration. One formatter per locale, built on first use.
const formatters = new Map<string, Intl.DateTimeFormat>();

const formatterOf = (locale: string): Intl.DateTimeFormat => {
  const known = formatters.get(locale);
  if (known !== undefined) return known;

  const created = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' });
  formatters.set(locale, created);
  return created;
};

// An unreadable date stays "Invalid Date" as it did with toLocaleDateString,
// where Intl would throw in the middle of a render.
export const formatDayMonth = (date: Date, locale: string): string =>
  Number.isNaN(date.getTime()) ? date.toString() : formatterOf(locale).format(date);
