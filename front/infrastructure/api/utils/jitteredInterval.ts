// How long a polling loop waits before asking again: the interval, give or take
// a fifth, so several tabs opened together drift apart instead of asking the API
// in the same second. Full jitter would halve the polling rate, so it is not used.
export const jitteredInterval = (intervalMs: number, random: () => number = Math.random): number =>
  Math.round(intervalMs * (0.8 + random() * 0.4));
