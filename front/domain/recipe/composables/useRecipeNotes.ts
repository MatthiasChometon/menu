// One little notebook per recipe, kept for the life of the app: "half the
// chilli next time" is only useful if it is still there next time.
const noteStores = new Map<string, Ref<string>>();

const MAX_LENGTH = 400;

// What a reader sees as one character, however many code points it takes: a
// pepper with its variation selector, or a family emoji joined from several, is
// kept whole or dropped, never left half drawn.
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

const truncated = (raw: string): string =>
  Array.from(graphemes.segment(raw), ({ segment }): string => segment)
    .slice(0, MAX_LENGTH)
    .join('');

// Stored as the bare text, not as JSON: that is how every note already saved in
// a reader's browser was written, and reading it as JSON would lose them all.
// localStorage is the reader's browser, so what comes back is bounded: a hand
// edit or another tab cannot leave a megabyte behind a 400-character field. The
// count is in graphemes, so no character a reader sees is ever cut in half.
const noteSerializer = {
  read: (raw: string): string => truncated(raw),
  write: (value: string): string => value,
};

const noteFor = (recipeId: string): Ref<string> => {
  const existing = noteStores.get(recipeId);
  if (existing !== undefined) return existing;

  const created = useLocalStorage<string>(`recipe-note:${recipeId}`, '', {
    serializer: noteSerializer,
  });
  noteStores.set(recipeId, created);
  return created;
};

export const useRecipeNoteConstraints = (): { maxLength: number } => ({ maxLength: MAX_LENGTH });

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
