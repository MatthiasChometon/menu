import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import SaveStatus from './SaveStatus.vue';
import type { SaveState } from '../types/planner.type';

const propsFor = (state: SaveState, hasWeek = true): Record<string, unknown> => ({
  hasWeek,
  state,
  savedLabel: '10:00',
  weekLabel: 'this week',
});

const mountWith = (state: SaveState, hasWeek = true): ReturnType<typeof mountSuspended> =>
  mountSuspended(SaveStatus, { props: propsFor(state, hasWeek) });

describe('the save status under the save button', () => {
  it('tells a signed-out reader to sign in', async () => {
    const wrapper = await mountWith('signedOut');

    expect(wrapper.text()).toContain('Connecte-toi');
  });

  it('says the save did not go through, inside the status region', async () => {
    const wrapper = await mountWith('failed');

    expect(wrapper.find('[role="status"]').text()).toContain("n'a pas abouti");
  });

  it('does not nest an alert in the status region', async () => {
    const wrapper = await mountWith('failed');

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('says there are unsaved changes while some are pending', async () => {
    const wrapper = await mountWith('pending');

    expect(wrapper.text()).toContain('non enregistrées');
  });

  it('says when the week was saved, with the time and the week', async () => {
    const wrapper = await mountWith('saved');

    expect(wrapper.text()).toContain('10:00');
    expect(wrapper.text()).toContain('this week');
  });

  it('says there is nothing to save when nothing changed', async () => {
    const wrapper = await mountWith('nothing');

    expect(wrapper.text()).toContain('Rien de nouveau');
  });

  it('keeps its status region in the page before there is a week to save', async () => {
    const wrapper = await mountWith('nothing', false);

    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    expect(wrapper.find('[role="status"]').text()).toBe('');
  });

  it('keeps the same status region when a failure turns into a save', async () => {
    const wrapper = await mountWith('failed');
    const region = wrapper.find('[role="status"]').element;

    await wrapper.setProps(propsFor('saved'));

    expect(wrapper.find('[role="status"]').element).toBe(region);
    expect(wrapper.find('[role="status"]').text()).toContain('10:00');
  });
});
