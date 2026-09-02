import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import Card from './Card.vue';

const sampleMenu = (): Menu => {
  const { latestMenu } = useMenu();
  if (latestMenu === undefined) throw new Error('no menu to check');
  return latestMenu;
};

describe('WeekShareCard', () => {
  it('renders a labelled image the week can be read from', async () => {
    const wrapper = await mountSuspended(Card, { props: { menu: sampleMenu() } });

    const canvas = wrapper.find('canvas');
    expect(canvas.exists()).toBe(true);
    expect(canvas.attributes('aria-label')).not.toBe('');
  });
});
