import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
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

  it('says so when the card could not be turned into an image', async () => {
    await openDialog();
    // A canvas that cannot be captured, as in a browser without toBlob.
    const canvas = document.querySelector('canvas');
    if (canvas === null) throw new Error('The card was not drawn.');
    Object.defineProperty(canvas, 'toBlob', { value: undefined, configurable: true });

    buttonNamed('Télécharger')?.click();

    await vi.waitFor((): void => {
      expect(document.querySelector('[role="alert"]')?.textContent).toContain(
        "L'image n'a pas pu être créée",
      );
    });
  });
});
