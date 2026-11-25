import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import SaveStatus from './SaveStatus.vue';
import type { SaveState } from '../types/planner.type';

const mountWith = (props: {
  hasWeek?: boolean;
  state: SaveState;
}): ReturnType<typeof mountSuspended> =>
  mountSuspended(SaveStatus, {
    props: { hasWeek: true, savedLabel: '10:00', weekLabel: 'this week', ...props },
  });

describe('the save status under the save button', () => {
  it('announces a failed save as an alert', async () => {
    const wrapper = await mountWith({ state: 'failed' });

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });

  it('does not raise an alert when the save went well', async () => {
    const wrapper = await mountWith({ state: 'saved' });

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('10:00');
  });

  it('keeps its status region in the page before there is a week to save', async () => {
    const wrapper = await mountWith({ hasWeek: false, state: 'nothing' });

    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    expect(wrapper.find('[role="status"]').text()).toBe('');
  });
});
