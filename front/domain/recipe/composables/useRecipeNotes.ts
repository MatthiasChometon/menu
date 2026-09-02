// One little notebook per recipe, kept for the life of the app: "half the
// chilli next time" is only useful if it is still there next time.
const noteStores = new Map<string, Ref<string>>();

const noteFor = (recipeId: string): Ref<string> => {
  const existing = noteStores.get(recipeId);
  if (existing !== undefined) return existing;

  const created = useLocalStorage<string>(`recipe-note:${recipeId}`, '');
  noteStores.set(recipeId, created);
  return created;
};

export const useRecipeNoteConstraints = (): { maxLength: number } => ({ maxLength: 400 });

export const useRecipeNotes = (
  recipeId: MaybeRefOrGetter<string>,
): {
  note: WritableComputedRef<string>;
  hasNote: ComputedRef<boolean>;
  clear: () => void;
} => {
  const note = computed<string>({
    get: (): string => noteFor(toValue(recipeId)).value,
    set: (value: string): void => {
      noteFor(toValue(recipeId)).value = value;
    },
  });

  return {
    note,
    hasNote: computed((): boolean => note.value.trim().length > 0),
    clear: (): void => {
      noteFor(toValue(recipeId)).value = '';
    },
  };
};
