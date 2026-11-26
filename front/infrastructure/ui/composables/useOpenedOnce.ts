// A dialog that is mounted only once it has been asked for keeps its code out of
// the first load, and keeps living after it closes so its leaving animation and
// the form the reader was typing in are not thrown away.
export const useOpenedOnce = (isOpen: Ref<boolean>): Ref<boolean> => {
  const hasBeenOpened = ref(isOpen.value);

  watch(isOpen, (value): void => {
    if (value) hasBeenOpened.value = true;
  });

  return hasBeenOpened;
};
