import { beforeEach, describe, expect, it } from 'vitest';

// The note lives in localStorage, which is shared across tests in a file.
beforeEach((): void => {
  useRecipeNotes('chiliChicken').clear();
  useRecipeNotes('beefLentilBolognese').clear();
});

describe('useRecipeNotes', () => {
  // Regression guard, because the bare text was already read as is before the
  // serializer: it pins that the bound did not break the notes already saved.
  it('reads a note saved by an earlier version of the app, which stored the bare text', () => {
    localStorage.setItem('recipe-note:legacyNote', 'moitié moins de piment');

    expect(useRecipeNotes('legacyNote').note.value).toBe('moitié moins de piment');
  });

  it('keeps no more than the editor lets a reader type, whatever was left in storage', () => {
    localStorage.setItem('recipe-note:oversizedNote', 'x'.repeat(10_000));

    const { note } = useRecipeNotes('oversizedNote');

    expect(note.value).toHaveLength(400);
  });

  it('counts characters, so an emoji on the boundary is kept whole or dropped, never cut', () => {
    localStorage.setItem('recipe-note:emojiNote', `${'x'.repeat(399)}🌶️🌶️`);

    const { note } = useRecipeNotes('emojiNote');

    expect(Array.from(note.value)).toHaveLength(400);
    expect(note.value.endsWith('x🌶')).toBe(true);
  });

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
