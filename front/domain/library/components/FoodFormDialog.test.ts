import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FoodFormDialog from './FoodFormDialog.vue';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

mockNuxtImport('useMyFoods', () => (): { create: typeof create; update: () => void } => ({
  create,
  update: vi.fn(),
}));

beforeEach(async (): Promise<void> => {
  await useNuxtApp().$i18n.setLocale('fr');
  create.mockReset();
  document.body.innerHTML = '';
});

const fillAndSave = async (): Promise<void> => {
  const name = document.body.querySelector<HTMLInputElement>('input');
  if (name === null) throw new Error('The dialog has no name field.');
  name.value = 'Tofu maison';
  name.dispatchEvent(new Event('input'));
  await flushPromises();
  [...document.body.querySelectorAll('button')]
    .find((button): boolean => button.textContent.trim() === 'Enregistrer')
    ?.click();
  await flushPromises();
};

describe('the food dialog', () => {
  it('saves the food it was filled with', async () => {
    create.mockResolvedValue(undefined);

    const wrapper = await mountSuspended(FoodFormDialog, { props: { modelValue: true } });
    await flushPromises();
    await fillAndSave();
    wrapper.unmount();

    expect(create).toHaveBeenCalledTimes(1);
  });

  it('says so, in an alert, when the food could not be saved', async () => {
    create.mockRejectedValue(new Error('offline'));
    const wrapper = await mountSuspended(FoodFormDialog, { props: { modelValue: true } });
    await flushPromises();

    await fillAndSave();

    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain(
      "L'enregistrement a échoué",
    );
    wrapper.unmount();
  });
});
