export type PlainButtonVariant = 'ghost' | 'subtle' | 'solid' | 'soft' | 'outline';
export type PlainButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type PlainButtonColor = 'primary' | 'neutral' | 'error';

// Static class lists equal to what Nuxt UI's `UButton` resolves for these combinations. They are
// literal strings so Tailwind sees them, and `plainButton.test.ts` compares them with the Nuxt UI
// theme so they cannot drift. A `UButton` instance costs a theme proxy, a tailwind-variants call
// and a class merge on every render, which adds up in the header and on the cards of a throttled phone.
const base =
  'rounded-md font-medium inline-flex items-center disabled:cursor-not-allowed aria-disabled:cursor-not-allowed disabled:opacity-75 aria-disabled:opacity-75 transition-colors';

const sizes: Record<PlainButtonSize, { text: string; padding: string; square: string }> = {
  xs: { text: 'text-xs gap-1', padding: 'px-2 py-1', square: 'p-1' },
  sm: { text: 'text-xs gap-1.5', padding: 'px-2.5 py-1.5', square: 'p-1.5' },
  md: { text: 'text-sm gap-1.5', padding: 'px-2.5 py-1.5', square: 'p-1.5' },
  lg: { text: 'text-sm gap-2', padding: 'px-3 py-2', square: 'p-2' },
  xl: { text: 'text-base gap-2', padding: 'px-3 py-2', square: 'p-2' },
};

// Only the combinations the app uses; add one here with its test row when a new one is needed.
const looks = {
  'neutral-ghost':
    'text-default hover:bg-elevated active:bg-elevated outline-inverted/25 focus-visible:outline-3 hover:disabled:bg-transparent dark:hover:disabled:bg-transparent hover:aria-disabled:bg-transparent dark:hover:aria-disabled:bg-transparent',
  'neutral-subtle':
    'ring ring-inset ring-accented text-default bg-elevated hover:bg-accented/75 active:bg-accented/75 disabled:bg-elevated aria-disabled:bg-elevated outline-inverted/25 focus-visible:outline-3 focus-visible:ring-inverted',
  'neutral-solid':
    'text-inverted bg-inverted hover:bg-inverted/90 active:bg-inverted/90 disabled:bg-inverted aria-disabled:bg-inverted outline-inverted/25 focus-visible:outline-3',
  'neutral-soft':
    'text-default bg-elevated hover:bg-accented/75 active:bg-accented/75 outline-inverted/25 focus-visible:outline-3 disabled:bg-elevated aria-disabled:bg-elevated',
  'primary-solid':
    'text-inverted bg-primary hover:bg-primary/75 active:bg-primary/75 disabled:bg-primary aria-disabled:bg-primary outline-primary/25 focus-visible:outline-3',
  'primary-soft':
    'text-primary bg-primary/10 hover:bg-primary/15 active:bg-primary/15 outline-primary/25 focus-visible:outline-3 disabled:bg-primary/10 aria-disabled:bg-primary/10',
  'primary-outline':
    'ring ring-inset ring-primary/50 text-primary hover:bg-primary/10 active:bg-primary/10 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent outline-primary/25 focus-visible:outline-3 focus-visible:ring-primary',
  'error-solid':
    'text-inverted bg-error hover:bg-error/75 active:bg-error/75 disabled:bg-error aria-disabled:bg-error outline-error/25 focus-visible:outline-3',
  'error-ghost':
    'text-error hover:bg-error/10 active:bg-error/10 outline-error/25 focus-visible:outline-3 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent',
} as const;

export type PlainButtonLook = keyof typeof looks;

// Every combination the app draws, as [color, variant]; the test walks this list.
export const plainButtonLooks = Object.keys(looks).map(
  (key): [PlainButtonColor, PlainButtonVariant] => {
    const [color, variant] = key.split('-');
    return [color as PlainButtonColor, variant as PlainButtonVariant];
  },
);

const defaultColor = (variant: PlainButtonVariant): PlainButtonColor =>
  variant === 'solid' || variant === 'soft' || variant === 'outline' ? 'primary' : 'neutral';

export const plainButtonClasses = (
  variant: PlainButtonVariant,
  size: PlainButtonSize,
  square: boolean,
  color: PlainButtonColor = defaultColor(variant),
  block = false,
): string => {
  const { text, padding, square: squarePadding } = sizes[size];
  const look = looks[`${color}-${variant}` as PlainButtonLook];
  return [base, square ? squarePadding : padding, text, look, block ? 'w-full justify-center' : '']
    .filter(Boolean)
    .join(' ');
};
