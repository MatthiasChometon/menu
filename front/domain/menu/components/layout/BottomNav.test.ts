import { mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it } from 'vitest';
import BottomNav from './BottomNav.vue';

beforeEach(async (): Promise<void> => {
  await useNuxtApp().$i18n.setLocale('fr');
});

describe('the mobile bottom navigation', () => {
  it('lists the five destinations, no "more" tab hiding any', async () => {
    const wrapper = await mountSuspended(BottomNav);

    const labels = wrapper.findAll('nav a').map((link): string => link.text());
    expect(labels).toEqual(["Aujourd'hui", 'Semaine', 'Courses', 'Progrès', 'Recettes']);
  });
});
