/** Generates a first week in one click and lands the reader on it — the whole
 *  point of the onboarding, and worth offering again from the empty state for
 *  anyone who skipped it. Reuses generateWeek() as-is: nothing here decides
 *  how a week is built, only what happens once it is. */
export const useGenerateFirstWeek = (): {
  isGenerating: Ref<boolean>;
  hasFailed: Ref<boolean>;
  generate: () => Promise<void>;
} => {
  const { generateWeek, isGenerating, save, saveFailed } = usePlanner();
  const { week: plannerWeek } = usePlannerWeek();
  const { user } = useAuth();
  const { selectedWeek } = useSelectedWeek();
  const localePath = useLocalePath();

  return {
    isGenerating,
    hasFailed: saveFailed,
    generate: async (): Promise<void> => {
      await generateWeek();

      // Signed out, there is no account to save to: the fresh week is left
      // exactly where the composer already shows it, with its own prompt to
      // sign in before it can be kept.
      if (user.value === undefined) {
        await navigateTo(localePath('/composer'));
        return;
      }

      await save();
      if (saveFailed.value) return;

      // Points the rest of the app at the week just composed, the same jump
      // the composer's own save button makes.
      selectedWeek.value = plannerWeek.value;
      await navigateTo(localePath('/'));
    },
  };
};
