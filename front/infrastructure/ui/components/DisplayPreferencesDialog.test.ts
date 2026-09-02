import { mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it } from 'vitest';
import DisplayPreferencesDialog from './DisplayPreferencesDialog.vue';

// The modal teleports its body out of the component, so every control is
// looked for in the document — the same place a reader's browser puts it.
const openDialog = async (): Promise<void> => {
  await mountSuspended(DisplayPreferencesDialog, { props: { modelValue: true } });
  await nextTick();
  await nextTick();
};

const buttonWithText = (text: string): HTMLButtonElement | undefined =>
  [...document.querySelectorAll('button')].find(
    (button): boolean => button.textContent?.trim() === text,
  );

beforeEach(async (): Promise<void> => {
  await useNuxtApp().$i18n.setLocale('fr');
  const { fontScale, isHighContrast } = useDisplayPreferences();
  fontScale.value = 'normal';
  isHighContrast.value = false;
});

describe('the display preferences dialog', () => {
  it('marks the active font scale as pressed', async () => {
    await openDialog();

    expect(buttonWithText('Normale')?.getAttribute('aria-pressed')).toBe('true');
    expect(buttonWithText('Grande')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('switches the font scale to large on click', async () => {
    await openDialog();

    buttonWithText('Grande')?.click();
    await nextTick();

    expect(useDisplayPreferences().fontScale.value).toBe('large');
  });

  it('toggles high contrast through the switch', async () => {
    await openDialog();

    const toggle = document.querySelector<HTMLElement>('[role="switch"]');
    toggle?.click();
    await nextTick();

    expect(useDisplayPreferences().isHighContrast.value).toBe(true);
  });

  it('names every control for a screen reader', async () => {
    await openDialog();

    const toggle = document.querySelector('[role="switch"]');
    expect(toggle?.getAttribute('aria-label')).toBeTruthy();
  });
});
