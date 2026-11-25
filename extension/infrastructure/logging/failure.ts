// What a fire-and-forget call ends with: nothing waits for it, so its failure
// has nowhere to go but the console of the extension, with enough context to
// tell which call it was. Never swallowed silently.
export const logFailure =
  (context: string): ((error: unknown) => void) =>
  (error: unknown): void => {
    console.error(`[menu] ${context} failed`, error);
  };
