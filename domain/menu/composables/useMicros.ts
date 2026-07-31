const MICRO_KEYS: readonly MicroKey[] = [
  'omega3',
  'vitaminD',
  'iron',
  'zinc',
  'magnesium',
  'calcium',
  'potassium',
  'vitaminC',
];

// Daily targets from the profile: what a 7-day-a-week lifter actually needs,
// not the general population floor.
const DAILY_TARGETS: Micros = {
  iron: 11,
  zinc: 15,
  magnesium: 450,
  calcium: 1200,
  potassium: 4000,
  vitaminC: 150,
  vitaminD: 50,
  omega3: 2,
};

const UNITS: Record<MicroKey, string> = {
  iron: 'mg',
  zinc: 'mg',
  magnesium: 'mg',
  calcium: 'mg',
  potassium: 'mg',
  vitaminC: 'mg',
  vitaminD: 'µg',
  omega3: 'g',
};

const emptyMicros = (): Micros => ({
  iron: 0,
  zinc: 0,
  magnesium: 0,
  calcium: 0,
  potassium: 0,
  vitaminC: 0,
  vitaminD: 0,
  omega3: 0,
});

const microsOfQuantities = (quantities: FoodQuantity[]): Micros =>
  quantities.reduce((total, { food, grams }): Micros => {
    const scaled = emptyMicros();
    for (const key of MICRO_KEYS) scaled[key] = total[key] + (food.micros[key] * grams) / 100;
    return scaled;
  }, emptyMicros());

export const useMicros = (): {
  microsOfQuantities: (quantities: FoodQuantity[]) => Micros;
  highlightsOf: (micros: Micros, minimumPercent?: number) => MicroHighlight[];
  dailyTargets: Micros;
  unitOf: (key: MicroKey) => string;
} => ({
  microsOfQuantities,
  // A portion is worth mentioning only when it moves the needle: below a sixth
  // of the day's target, listing it would be noise.
  highlightsOf: (micros: Micros, minimumPercent = 15): MicroHighlight[] =>
    MICRO_KEYS.map((key): MicroHighlight => {
      const target = DAILY_TARGETS[key];
      return {
        key,
        amount: micros[key],
        unit: UNITS[key],
        percentOfTarget: target === 0 ? 0 : (micros[key] / target) * 100,
      };
    })
      .filter((highlight): boolean => highlight.percentOfTarget >= minimumPercent)
      .sort((left, right): number => right.percentOfTarget - left.percentOfTarget),
  dailyTargets: DAILY_TARGETS,
  unitOf: (key: MicroKey): string => UNITS[key],
});
