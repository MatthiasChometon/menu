// "le paquet de 500g", "les 3 boites de 400g", "la bouteille 1L", "la barquette
// de 6 de 100g". The shop writes these for people, not for programs, so this
// reads what it can and says nothing rather than guessing.
const UNITS: Record<string, number> = { g: 1, kg: 1000, ml: 1, cl: 10, l: 1000 };

const AMOUNT = /(\d+(?:[.,]\d+)?)\s*(kg|g|cl|ml|l)\b/gi;
// "3 boites de", "6 bouteilles de", "6 de", "3 x": the counted noun often sits
// between the number and the amount it multiplies.
const MULTIPLIER = /(\d+)\s*(?:x|×|(?:[a-zà-ÿ]+\s+)?de\b)/i;

export const contentOf = (packaging: string): number | undefined => {
  // The last amount is the one that describes a unit: "les 3 boites de 400g"
  // ends on what one box holds.
  const last = [...packaging.matchAll(AMOUNT)].at(-1);
  if (last === undefined) return undefined;

  const rawAmount = last[1];
  const rawUnit = last[2];
  if (rawAmount === undefined || rawUnit === undefined) return undefined;

  const amount = Number(rawAmount.replace(',', '.'));
  const factor = UNITS[rawUnit.toLowerCase()];
  if (Number.isNaN(amount) || factor === undefined) return undefined;

  const single = amount * factor;
  const multiplier = MULTIPLIER.exec(packaging.slice(0, last.index));

  return multiplier === null ? single : single * Number(multiplier[1]);
};
