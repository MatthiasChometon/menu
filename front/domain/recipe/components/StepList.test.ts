import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { DOMWrapper, VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import StepList from './StepList.vue';

// The timer board lives in localStorage across the whole file, so each test
// starts from an empty board rather than depending on execution order.
beforeEach((): void => {
  useTimers().clear();
});

const NO_DURATION = "Émincer l'oignon et le poivron.";
const WITH_DURATION = 'Laisser mijoter 25 min à couvert.';

const findArmButton = (wrapper: VueWrapper): DOMWrapper<HTMLButtonElement> => {
  const button = wrapper
    .findAll<'button'>('button')
    .find((candidate): boolean => candidate.text().includes('Armer un minuteur'));
  if (button === undefined) throw new Error('no arm-timer button found');

  return button;
};

describe('arming a timer from a step', () => {
  it('offers no timer button on a step without a duration', async () => {
    const wrapper = await mountSuspended(StepList, { props: { steps: [NO_DURATION] } });

    expect(wrapper.text()).not.toContain('Armer un minuteur');
  });

  it('offers to arm a timer for the duration written in the step', async () => {
    const wrapper = await mountSuspended(StepList, { props: { steps: [NO_DURATION, WITH_DURATION] } });

    expect(wrapper.text()).toContain('Armer un minuteur');
    expect(wrapper.text()).toContain('25');
  });

  it('adds a named timer to the board once armed', async () => {
    const wrapper = await mountSuspended(StepList, {
      props: { steps: [WITH_DURATION], recipeName: 'Poulet basquaise' },
    });

    await findArmButton(wrapper).trigger('click');

    const [timer] = useTimers().timersAt(Date.now());
    expect(timer?.label).toBe(`Poulet basquaise · ${WITH_DURATION}`);
    expect(timer?.durationSeconds).toBe(25 * 60);
    expect(wrapper.text()).toContain('Minuteur armé');
  });

  it('falls back to the step text when no recipe name is given', async () => {
    const wrapper = await mountSuspended(StepList, { props: { steps: [WITH_DURATION] } });

    await findArmButton(wrapper).trigger('click');

    const [timer] = useTimers().timersAt(Date.now());
    expect(timer?.label).toBe(WITH_DURATION);
  });

  it('never arms the same step twice', async () => {
    const wrapper = await mountSuspended(StepList, { props: { steps: [WITH_DURATION] } });

    await findArmButton(wrapper).trigger('click');
    await wrapper.find('button:disabled').trigger('click');

    expect(useTimers().timersAt(Date.now())).toHaveLength(1);
  });
});

describe('ticking a step off', () => {
  it('marks a step done on tap, and counts it in the progress', async () => {
    const wrapper = await mountSuspended(StepList, { props: { steps: [NO_DURATION, WITH_DURATION] } });

    expect(wrapper.text()).toContain('0 / 2');

    await wrapper.find('button[role="checkbox"]').trigger('click');

    expect(wrapper.find('button[role="checkbox"]').attributes('aria-checked')).toBe('true');
    expect(wrapper.text()).toContain('1 / 2');
  });
});
