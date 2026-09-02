import { beforeEach, describe, expect, it } from 'vitest';

// The note lives in localStorage, which is shared across tests in a file.
beforeEach((): void => {
  useRecipeNotes('chiliChicken').clear();
  useRecipeNotes('beefLentilBolognese').clear();
});

describe('useRecipeNotes', () => {
  it('starts empty', () => {
    const { note, hasNote } = useRecipeNotes('chiliChicken');

    expect(note.value).toBe('');
    expect(hasNote.value).toBe(false);
  });

  it('remembers what was written', () => {
    const { note } = useRecipeNotes('chiliChicken');

    note.value = 'moitié moins de piment la prochaine fois';

    expect(useRecipeNotes('chiliChicken').note.value).toBe(
      'moitié moins de piment la prochaine fois',
    );
  });

  it('keeps a note out of another recipe', () => {
    useRecipeNotes('chiliChicken').note.value = 'plus de riz';

    expect(useRecipeNotes('beefLentilBolognese').note.value).toBe('');
  });

  it('reports a whitespace-only note as no note', () => {
    const { note, hasNote } = useRecipeNotes('chiliChicken');

    note.value = '   ';

    expect(hasNote.value).toBe(false);
  });

  it('forgets the note once cleared', () => {
    const { note, clear } = useRecipeNotes('chiliChicken');

    note.value = 'à refaire';
    clear();

    expect(note.value).toBe('');
  });
});
