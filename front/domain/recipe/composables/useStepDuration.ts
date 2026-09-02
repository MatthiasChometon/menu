// Recognises a duration written into a step's own sentence ("40 min à petits
// bouillons", "1 h 30 au four", "20 minutes à feu doux") so the step can offer
// to arm a timer for exactly that long. Hours are tried first: "1 h 30" would
// otherwise read as a bare "30" from the minutes pattern alone.
const HOUR_DURATION = /(\d+)\s*h\s*(\d{1,2})?/i;
const MINUTE_DURATION = /(\d+)\s*(?:min(?:ute)?s?)\b/i;

export const useStepDuration = (): {
  minutesOf: (step: string) => number | undefined;
} => {
  const minutesOf = (step: string): number | undefined => {
    const hourMatch = step.match(HOUR_DURATION);
    if (hourMatch !== null) {
      const hours = Number(hourMatch[1]);
      const extraMinutes = hourMatch[2] === undefined ? 0 : Number(hourMatch[2]);
      return hours * 60 + extraMinutes;
    }

    const minuteMatch = step.match(MINUTE_DURATION);
    return minuteMatch === null ? undefined : Number(minuteMatch[1]);
  };

  return { minutesOf };
};
