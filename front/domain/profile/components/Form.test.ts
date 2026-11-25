import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Form from './Form.vue';

const { nutritionTargets } = vi.hoisted(() => ({ nutritionTargets: vi.fn() }));

mockNuxtImport('GqlNutritionTargets', () => nutritionTargets);

const targets = { kcal: 2000, protein: 100, fat: 70, carbs: 250, fiber: 30 };

beforeEach(async (): Promise<void> => {
  await useNuxtApp().$i18n.setLocale('fr');
  nutritionTargets.mockReset();
  nutritionTargets.mockResolvedValue({ nutritionTargets: targets });
  clearNuxtData();
});

const LAST_STEP = 7;

const goToSummary = async (wrapper: Awaited<ReturnType<typeof mountSuspended>>): Promise<void> => {
  for (let step = 0; step < LAST_STEP; step += 1) {
    await wrapper.find('button.ml-auto').trigger('click');
    await flushPromises();
  }
};

describe('the profile form', () => {
  it('saves the answers and says it is done', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const wrapper = await mountSuspended(Form, { props: { save } });

    await goToSummary(wrapper);
    await wrapper.find('button.ml-auto').trigger('click');
    await flushPromises();

    expect(save).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('saved')).toHaveLength(1);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('says so, in an alert, when the answers could not be saved, and does not claim they were', async () => {
    const save = vi.fn().mockRejectedValue(new Error('offline'));
    const wrapper = await mountSuspended(Form, { props: { save } });

    await goToSummary(wrapper);
    await wrapper.find('button.ml-auto').trigger('click');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toContain("L'enregistrement n'a pas fonctionné");
    expect(wrapper.emitted('saved')).toBeUndefined();
  });

  it('says the marks could not be worked out, and retries, instead of showing skeletons for ever', async () => {
    nutritionTargets.mockRejectedValueOnce(new Error('offline'));
    const wrapper = await mountSuspended(Form, { props: { save: vi.fn() } });

    await goToSummary(wrapper);

    expect(wrapper.find('[role="alert"]').text()).toContain("n'ont pas pu être calculés");

    const retry = wrapper
      .findAll('button')
      .find((candidate): boolean => candidate.text() === 'Réessayer');
    await retry?.trigger('click');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('2000 kcal');
  });
});
