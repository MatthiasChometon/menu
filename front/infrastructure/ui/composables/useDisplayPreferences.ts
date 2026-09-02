// One instance for the whole app: the header trigger and the panel it opens
// both read the same preference, and a fresh useLocalStorage() per caller
// would only pick up the other's write on the next storage event — which
// browsers never fire back into the tab that made the change.
let sharedFontScale: Ref<FontScale> | undefined;
let sharedHighContrast: Ref<boolean> | undefined;

const fontScaleRef = (): Ref<FontScale> => {
  sharedFontScale ??= useLocalStorage<FontScale>('display:font-scale', 'normal');
  return sharedFontScale;
};

const highContrastRef = (): Ref<boolean> => {
  sharedHighContrast ??= useLocalStorage<boolean>('display:high-contrast', false);
  return sharedHighContrast;
};

export const useDisplayPreferences = (): {
  fontScale: Ref<FontScale>;
  isHighContrast: Ref<boolean>;
  setFontScale: (scale: FontScale) => void;
  toggleHighContrast: () => void;
} => {
  const fontScale = fontScaleRef();
  const isHighContrast = highContrastRef();

  return {
    fontScale,
    isHighContrast,
    setFontScale: (scale: FontScale): void => {
      fontScale.value = scale;
    },
    toggleHighContrast: (): void => {
      isHighContrast.value = !isHighContrast.value;
    },
  };
};
