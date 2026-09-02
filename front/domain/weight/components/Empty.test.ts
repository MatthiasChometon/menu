import { mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it } from 'vitest';
import Empty from './Empty.vue';

beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('the empty weight diary', () => {
  it('says plainly that nothing has been logged yet', async () => {
    const wrapper = await mountSuspended(Empty);

    expect(wrapper.text()).toContain("Aucune pesée pour l'instant");
  });

  it('asks to log the first weigh-in when the call to action is pressed', async () => {
    const wrapper = await mountSuspended(Empty);

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('addFirst')).toHaveLength(1);
  });
});
