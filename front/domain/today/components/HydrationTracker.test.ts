import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import HydrationTracker from './HydrationTracker.vue';

const propsWith = (glasses: number): InstanceType<typeof HydrationTracker>['$props'] => ({
  glasses,
  targetGlasses: 7,
  maxGlasses: 8,
  liters: (glasses * 500) / 1000,
  hasReachedTarget: glasses >= 7,
});

describe('the hydration tracker', () => {
  it('shows how many litres have been drunk so far', async () => {
    const wrapper = await mountSuspended(HydrationTracker, { props: propsWith(3) });

    expect(wrapper.text()).toContain('1,5 L');
  });

  it('renders one button per glass up to the maximum', async () => {
    const wrapper = await mountSuspended(HydrationTracker, { props: propsWith(3) });

    expect(wrapper.findAll('[role="group"] button')).toHaveLength(8);
  });

  it('emits which glass was tapped', async () => {
    const wrapper = await mountSuspended(HydrationTracker, { props: propsWith(0) });

    await wrapper.findAll('[role="group"] button')[4]?.trigger('click');

    expect(wrapper.emitted('toggleGlass')?.[0]).toEqual([4]);
  });

  it('says nothing about reaching the target below it', async () => {
    const wrapper = await mountSuspended(HydrationTracker, { props: propsWith(5) });

    expect(wrapper.text()).not.toContain('Objectif atteint');
  });

  it('celebrates reaching the target', async () => {
    const wrapper = await mountSuspended(HydrationTracker, { props: propsWith(7) });

    expect(wrapper.text()).toContain('Objectif atteint');
  });
});
