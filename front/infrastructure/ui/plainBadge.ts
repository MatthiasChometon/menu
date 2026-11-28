export type PlainBadgeColor = 'neutral' | 'primary' | 'warning';

// Static class lists equal to what Nuxt UI's `UBadge` resolves for `subtle` + `sm` (the only badge the
// app draws). `plainBadge.test.ts` compares them with the Nuxt UI theme so they cannot drift. They are
// literal strings so Tailwind sees them.
const base = 'font-medium inline-flex items-center text-[10px]/3 px-1.5 py-1 gap-1 rounded-sm';

const colors: Record<PlainBadgeColor, string> = {
  neutral: 'ring ring-inset ring-accented text-default bg-elevated',
  primary: 'bg-primary/10 text-primary ring ring-inset ring-primary/25',
  warning: 'bg-warning/10 text-warning ring ring-inset ring-warning/25',
};

export const plainBadgeColors = Object.keys(colors) as PlainBadgeColor[];

export const plainBadgeClasses = (color: PlainBadgeColor): string => `${base} ${colors[color]}`;
