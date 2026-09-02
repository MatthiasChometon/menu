import { mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it } from 'vitest';
import BottomNav from './BottomNav.vue';

beforeEach(async (): Promise<void> => {
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('the mobile bottom navigation', () => {
  it('keeps only the four most reached-for destinations in the bar itself', async () => {
    const wrapper = await mountSuspended(BottomNav);

    const labels = wrapper.findAll('nav a').map((link): string => link.text());
    expect(labels).toEqual(["Aujourd'hui", 'Semaine', 'Courses', 'Composer']);
  });

  it('offers a labelled "Plus" tab for everything else, closed by default', async () => {
    const wrapper = await mountSuspended(BottomNav);

    expect(wrapper.find('nav button').text()).toBe('Plus');
    // The sheet teleports its content out of the wrapper once opened; while
    // closed nothing of it should already be sitting in the document.
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens the remaining destinations when "Plus" is pressed', async () => {
    const wrapper = await mountSuspended(BottomNav);

    await wrapper.find('nav button').trigger('click');
    await nextTick();
    await nextTick();

    const links = [...document.querySelectorAll('[role="dialog"] a')].map(
      (link): string | undefined => link.textContent?.trim(),
    );
    expect(links).toEqual(['Recettes', 'Cuisine', 'Poids', 'Progression', 'Mon profil']);
  });
});
