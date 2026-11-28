import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import PlainButton from './PlainButton.vue';

describe('the plain button', () => {
  it('is a type="button" that keeps its aria-label and listeners', async () => {
    let clicks = 0;
    const wrapper = await mountSuspended(PlainButton, {
      props: {
        size: 'sm',
        square: true,
        'aria-label': 'Mark as eaten',
        onClick: (): number => (clicks += 1),
      },
      slots: { default: 'x' },
    });
    const button = wrapper.get('button');

    expect(button.attributes('type')).toBe('button');
    expect(button.attributes('aria-label')).toBe('Mark as eaten');
    await button.trigger('click');
    expect(clicks).toBe(1);
  });

  it('can submit when asked to', async () => {
    const wrapper = await mountSuspended(PlainButton, { props: { type: 'submit' } });

    expect(wrapper.get('button').attributes('type')).toBe('submit');
  });
});
