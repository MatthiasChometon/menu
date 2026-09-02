import { mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it } from 'vitest';
import NoteEditor from './NoteEditor.vue';

beforeEach((): void => {
  useRecipeNotes('chiliChicken').clear();
});

describe('RecipeNoteEditor', () => {
  it('starts blank when nothing was ever written', async () => {
    const wrapper = await mountSuspended(NoteEditor, { props: { recipeId: 'chiliChicken' } });

    expect(wrapper.find<HTMLTextAreaElement>('textarea').element.value).toBe('');
    expect(wrapper.text()).toContain('0/400');
  });

  it('remembers what was typed for next time', async () => {
    const wrapper = await mountSuspended(NoteEditor, { props: { recipeId: 'chiliChicken' } });

    await wrapper.find('textarea').setValue('moitié moins de piment');

    expect(useRecipeNotes('chiliChicken').note.value).toBe('moitié moins de piment');
  });

  it('shows the note already written on an earlier visit', async () => {
    useRecipeNotes('chiliChicken').note.value = 'ajouter du fromage';

    const wrapper = await mountSuspended(NoteEditor, { props: { recipeId: 'chiliChicken' } });

    expect(wrapper.find<HTMLTextAreaElement>('textarea').element.value).toBe('ajouter du fromage');
  });
});
