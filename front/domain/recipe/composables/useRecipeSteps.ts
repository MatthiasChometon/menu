// An ingredient mentioned inside a step, written {display text|foodId} in the
// content. The display text carries the grammar the sentence needs ("l'oignon",
// "les tomates concassées"), the id carries the quantity to weigh out.
const MENTION = /\{([^{}|]+)\|([^{}]+)\}/g;

export type StepSegment = {
  text: string;
  foodId?: string;
};

export const useRecipeSteps = (): {
  segmentsOf: (step: string) => StepSegment[];
  plainTextOf: (step: string) => string;
} => {
  const segmentsOf = (step: string): StepSegment[] => {
    const segments: StepSegment[] = [];
    let cursor = 0;

    for (const match of step.matchAll(MENTION)) {
      const start = match.index;
      if (start > cursor) segments.push({ text: step.slice(cursor, start) });

      segments.push({ text: match[1] ?? '', foodId: match[2] });
      cursor = start + match[0].length;
    }

    if (cursor < step.length) segments.push({ text: step.slice(cursor) });

    return segments;
  };

  return {
    segmentsOf,
    // The sentence as a human reads it, markup stripped: what a screen reader or
    // a plain-text export needs.
    plainTextOf: (step: string): string =>
      segmentsOf(step)
        .map((segment): string => segment.text)
        .join(''),
  };
};
