import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecipeFormDialog from './RecipeFormDialog.vue';
import type { CustomRecipe } from '../../customCatalog/types/customCatalog.type';

const { update } = vi.hoisted(() => ({ update: vi.fn() }));

mockNuxtImport('useMyRecipes', () => (): { create: () => void; update: typeof update } => ({
  create: vi.fn(),
  update,
}));

// Editing a complete recipe: the form is valid as it opens, so the only thing
// between the reader and a save is the save itself.
const recipe = {
  id: 'r1',
  name: 'Poulet de mémé',
  slot: 'MAIN',
  ingredients: [{ foodId: 'salmon', grams: 150 }],
  steps: ['Cuire.'],
  prepMinutes: 20,
  batch: false,
} as CustomRecipe;

beforeEach(async (): Promise<void> => {
  await useNuxtApp().$i18n.setLocale('fr');
  update.mockReset();
  document.body.innerHTML = '';
});

const save = async (): Promise<void> => {
  [...document.body.querySelectorAll('button')]
    .find((button): boolean => button.textContent.trim() === 'Enregistrer')
    ?.click();
  await flushPromises();
};

describe('the recipe dialog', () => {
  it('saves the recipe', async () => {
    update.mockResolvedValue(undefined);
    const wrapper = await mountSuspended(RecipeFormDialog, {
      props: { modelValue: true, recipe },
    });
    await flushPromises();

    await save();
    wrapper.unmount();

    expect(update).toHaveBeenCalledWith('r1', expect.objectContaining({ name: 'Poulet de mémé' }));
  });

  it('says so, in an alert, when the recipe could not be saved', async () => {
    update.mockRejectedValue(new Error('offline'));
    const wrapper = await mountSuspended(RecipeFormDialog, {
      props: { modelValue: true, recipe },
    });
    await flushPromises();

    await save();

    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain(
      "L'enregistrement a échoué",
    );
    wrapper.unmount();
  });
});
