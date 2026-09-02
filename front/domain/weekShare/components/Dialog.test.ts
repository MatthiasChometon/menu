import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import Dialog from './Dialog.vue';

// The modal teleports its body out of the component, so it is looked for in
// the document rather than in the wrapper.
const openDialog = async (): Promise<void> => {
  await mountSuspended(Dialog);
  useWeekShare().open();
  await nextTick();
  await nextTick();
};

const buttonNamed = (words: string): HTMLButtonElement | undefined =>
  [...document.querySelectorAll('button')].find((candidate): boolean =>
    (candidate.textContent ?? '').includes(words),
  );

describe('the week share dialog', () => {
  it('shows a downloadable card for the week on screen', async () => {
    await openDialog();

    expect(document.querySelector('canvas')).not.toBeNull();
    expect(buttonNamed('Télécharger')).toBeDefined();
  });

  it('closes on request', async () => {
    await openDialog();

    buttonNamed('Fermer')?.click();
    await nextTick();

    expect(useWeekShare().isOpen.value).toBe(false);
  });
});
