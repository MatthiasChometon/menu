import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import LoadFailed from './LoadFailed.vue';

describe('the notice shown when the week could not be read', () => {
  it('is announced as an alert and says what happened', async () => {
    const wrapper = await mountSuspended(LoadFailed);

    expect(wrapper.find('[role="alert"]').text()).toContain("n'a pas pu être lue");
  });

  it('offers a retry that asks the page to read the week again', async () => {
    const wrapper = await mountSuspended(LoadFailed);

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('retry')).toHaveLength(1);
  });
});
