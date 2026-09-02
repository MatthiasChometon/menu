// Shared so the floating button and any other entry point open the same dialog.
export const useWeekShare = (): {
  isOpen: Ref<boolean>;
  open: () => void;
  close: () => void;
} => {
  const isOpen = useState<boolean>('weekShare:open', (): boolean => false);

  return {
    isOpen,
    open: (): void => {
      isOpen.value = true;
    },
    close: (): void => {
      isOpen.value = false;
    },
  };
};
