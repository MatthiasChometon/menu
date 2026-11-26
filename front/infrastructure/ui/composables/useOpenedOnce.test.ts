import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import { useOpenedOnce } from './useOpenedOnce';

describe('useOpenedOnce', () => {
  it('stays false until the dialog is asked for', async () => {
    const isOpen = ref(false);
    const hasBeenOpened = useOpenedOnce(isOpen);
    await nextTick();

    expect(hasBeenOpened.value).toBe(false);
  });

  it('turns true when the dialog opens and stays true once it closes', async () => {
    const isOpen = ref(false);
    const hasBeenOpened = useOpenedOnce(isOpen);

    isOpen.value = true;
    await nextTick();
    isOpen.value = false;
    await nextTick();

    expect(hasBeenOpened.value).toBe(true);
  });

  it('starts true when the dialog is already open', () => {
    expect(useOpenedOnce(ref(true)).value).toBe(true);
  });
});
