export const DEFAULT_PORT = 3779;

type RawEnvironment = Record<string, unknown>;

const isBlank = (value: unknown): boolean => typeof value !== 'string' || value.trim() === '';

const isPort = (value: string): boolean => {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65_535;
};

const isCount = (value: string): boolean => /^\d+$/.test(value.trim());

const missingRequired = (raw: RawEnvironment): string[] =>
  ['DATABASE_URL', 'JWT_SECRET']
    .filter((name): boolean => isBlank(raw[name]))
    .map((name): string => `${name} is required`);

// A numeric variable that is set but not a number only fails later, far from
// its cause (a mail transport on port NaN), so it is refused here.
const malformedNumbers = (raw: RawEnvironment): string[] => {
  const checks: [name: string, isValid: (value: string) => boolean, expected: string][] = [
    ['PORT', isPort, 'a TCP port'],
    ['MAIL_PORT', isPort, 'a TCP port'],
    ['BUG_NOTICES_PER_HOUR', isCount, 'a whole number'],
  ];

  return checks
    .filter(([name]): boolean => !isBlank(raw[name]))
    .filter(([name, isValid]): boolean => !isValid(String(raw[name]).trim()))
    .map(([name, , expected]): string => `${name} must be ${expected}`);
};

// Run by bootstrap before anything is built, so a missing secret stops the
// process at boot with every problem listed, not on the first request that
// happens to need it. Values are never echoed: they may be secrets.
//
// Deliberately short: what only matters to one feature (Google, mail, push) is
// read with getOrThrow where that feature starts, since an unset value there
// is a legitimate way to switch the feature off.
export const validateEnvironment = (raw: RawEnvironment): { PORT: number } => {
  const problems = [...missingRequired(raw), ...malformedNumbers(raw)];

  if (problems.length > 0) {
    throw new Error(`Invalid environment: ${problems.join('; ')}.`);
  }

  return { PORT: isBlank(raw.PORT) ? DEFAULT_PORT : Number(raw.PORT) };
};
