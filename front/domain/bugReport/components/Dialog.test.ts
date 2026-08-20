import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import Dialog from './Dialog.vue';

// The modal teleports its body out of the component, so the form is looked for
// in the document rather than in the wrapper — the same place a reader's
// browser puts it.
const openDialog = async (): Promise<void> => {
  await mountSuspended(Dialog);
  useBugReport().open();
  await nextTick();
  await nextTick();
};

const textarea = (): HTMLTextAreaElement | null => document.querySelector('textarea');

const sendButton = (): HTMLButtonElement | undefined =>
  [...document.querySelectorAll('button')].find((candidate): boolean =>
    (candidate.textContent ?? '').includes('Envoyer'),
  );

const type = async (words: string): Promise<void> => {
  const box = textarea();
  if (box === null) throw new Error('The dialog shows no box to write in.');

  box.value = words;
  box.dispatchEvent(new Event('input'));
  await nextTick();
};

describe('the report form', () => {
  it('will not send three words nobody could act on', async () => {
    await openDialog();
    await type('bug');

    // Refused here rather than by the server: being turned away after pressing
    // send is the moment somebody decides not to report the next one.
    expect(sendButton()?.disabled).toBe(true);
  });

  it('lets a real description through', async () => {
    await openDialog();
    await type('Le bouton ne fait rien quand je clique dessus.');

    expect(sendButton()?.disabled).toBe(false);
  });

  it('never asks the reader to describe their own browser', async () => {
    await openDialog();

    // Scoped to this form: a teleported dialog outlives its test, and counting
    // the whole document would count the ones opened above.
    const form = [...document.querySelectorAll('form')].at(-1);

    // One box to write in, and nothing else to fill. The page, the screen, the
    // browser and the language are taken from the request — a form that asked
    // for them is a form people abandon halfway.
    expect(form?.querySelectorAll('textarea')).toHaveLength(1);
    expect(form?.querySelectorAll('input')).toHaveLength(0);
  });
});
