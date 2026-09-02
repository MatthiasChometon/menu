import { beforeEach, describe, expect, it } from 'vitest';

describe('useDisplayPreferences', () => {
  beforeEach((): void => {
    const { fontScale, isHighContrast } = useDisplayPreferences();
    fontScale.value = 'normal';
    isHighContrast.value = false;
  });

  it('starts with a normal scale and standard contrast', () => {
    const { fontScale, isHighContrast } = useDisplayPreferences();

    expect(fontScale.value).toBe('normal');
    expect(isHighContrast.value).toBe(false);
  });

  it('remembers a larger scale across reads', () => {
    const { setFontScale } = useDisplayPreferences();

    setFontScale('large');

    expect(useDisplayPreferences().fontScale.value).toBe('large');
  });

  it('can move back to the normal scale', () => {
    const { setFontScale, fontScale } = useDisplayPreferences();

    setFontScale('large');
    setFontScale('normal');

    expect(fontScale.value).toBe('normal');
  });

  it('toggles high contrast on and back off', () => {
    const { toggleHighContrast, isHighContrast } = useDisplayPreferences();

    toggleHighContrast();
    expect(isHighContrast.value).toBe(true);

    toggleHighContrast();
    expect(isHighContrast.value).toBe(false);
  });
});
