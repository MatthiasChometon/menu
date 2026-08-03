import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import ChoiceGroup from './ChoiceGroup.vue';

const choices = [
  { value: 'LOSE_FAT', label: 'Perdre du poids', hint: 'Manger un peu moins' },
  { value: 'MAINTAIN', label: 'Rester comme je suis' },
];

describe('ProfileChoiceGroup', () => {
  it('offers every choice as a real radio, under a named group', async () => {
    const wrapper = await mountSuspended(ChoiceGroup, {
      props: { choices, modelValue: undefined, legend: 'Que voulez-vous faire ?' },
    });

    // Radios rather than clickable divs: arrow keys and screen readers work.
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2);
    expect(wrapper.find('legend').text()).toBe('Que voulez-vous faire ?');
    expect(wrapper.text()).toContain('Manger un peu moins');
  });

  it('marks the selected choice as checked', async () => {
    const wrapper = await mountSuspended(ChoiceGroup, {
      props: { choices, modelValue: 'MAINTAIN', legend: 'Choix' },
    });

    const radios = wrapper.findAll<HTMLInputElement>('input[type="radio"]');

    expect(radios[0]!.element.checked).toBe(false);
    expect(radios[1]!.element.checked).toBe(true);
  });

  it('reports the value the user picked', async () => {
    const wrapper = await mountSuspended(ChoiceGroup, {
      props: { choices, modelValue: undefined, legend: 'Choix' },
    });

    await wrapper.findAll('input[type="radio"]')[0]!.trigger('change');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['LOSE_FAT']);
  });
});
