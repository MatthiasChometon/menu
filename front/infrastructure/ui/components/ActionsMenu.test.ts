import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import ActionsMenu from './ActionsMenu.vue';

const items = [[{ label: 'Move to Tuesday' }]];

const settle = async (): Promise<void> => {
  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve): void => {
      setTimeout(resolve, 25);
    });
  }
};

describe('the actions menu', () => {
  it('shows a labelled button without loading the dropdown', async () => {
    const wrapper = await mountSuspended(ActionsMenu, { props: { items, label: 'Day actions' } });

    expect(wrapper.find('button[aria-label="Day actions"]').exists()).toBe(true);
    expect(wrapper.find('[aria-haspopup="menu"]').exists()).toBe(false);
  });

  it('opens its entries on the first click', async () => {
    const wrapper = await mountSuspended(ActionsMenu, {
      props: { items, label: 'Day actions' },
      attachTo: document.body,
    });

    await wrapper.find('button').trigger('click');
    await settle();

    expect(document.body.textContent).toContain('Move to Tuesday');
    wrapper.unmount();
  });
});
