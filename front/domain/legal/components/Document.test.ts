import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import Document from './Document.vue';

describe('a legal document', () => {
  it.each(['notice', 'privacy', 'terms'] as const)(
    'shows its title, its lead and at least one section for %s',
    async (namespace) => {
      const wrapper = await mountSuspended(Document, { props: { namespace } });

      expect(wrapper.find('h1').text()).not.toBe('');
      expect(wrapper.find('header p').text()).not.toBe('');
      expect(wrapper.findAll('section h2').length).toBeGreaterThan(0);
      expect(wrapper.findAll('section p').length).toBeGreaterThan(0);
    },
  );

  it('shows different texts for different documents', async () => {
    const notice = await mountSuspended(Document, { props: { namespace: 'notice' } });
    const privacy = await mountSuspended(Document, { props: { namespace: 'privacy' } });

    expect(notice.find('h1').text()).not.toBe(privacy.find('h1').text());
  });
});
