import { mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it } from 'vitest';
import IntroSlides from './IntroSlides.vue';

type Clickable = { text: () => string; trigger: (event: string) => Promise<void> };

const buttonSaying = (
  wrapper: { findAll: (selector: string) => Clickable[] },
  words: string,
): Clickable | undefined =>
  wrapper.findAll('button').find((candidate): boolean => candidate.text().includes(words));

describe('the onboarding intro slides', () => {
  beforeEach(async (): Promise<void> => {
    await useNuxtApp().$i18n.setLocale('fr');
  });

  it('opens on the first slide, with no way back', async () => {
    const wrapper = await mountSuspended(IntroSlides);

    expect(wrapper.text()).toContain('Des repas pesés au gramme');
    expect(buttonSaying(wrapper, 'Retour')).toBeUndefined();
  });

  it('walks forward through every slide before offering to finish', async () => {
    const wrapper = await mountSuspended(IntroSlides);

    await buttonSaying(wrapper, 'Suivant')?.trigger('click');
    expect(wrapper.text()).toContain('Une semaine générée en un clic');

    await buttonSaying(wrapper, 'Suivant')?.trigger('click');
    expect(wrapper.text()).toContain('Courses et batch cooking inclus');
    expect(buttonSaying(wrapper, "C'est parti")).toBeDefined();
  });

  it('emits finished once the last slide is confirmed', async () => {
    const wrapper = await mountSuspended(IntroSlides);
    await buttonSaying(wrapper, 'Suivant')?.trigger('click');
    await buttonSaying(wrapper, 'Suivant')?.trigger('click');

    await buttonSaying(wrapper, "C'est parti")?.trigger('click');

    expect(wrapper.emitted('finished')).toHaveLength(1);
  });

  it('goes back a slide without losing the walkthrough', async () => {
    const wrapper = await mountSuspended(IntroSlides);
    await buttonSaying(wrapper, 'Suivant')?.trigger('click');

    await buttonSaying(wrapper, 'Retour')?.trigger('click');

    expect(wrapper.text()).toContain('Des repas pesés au gramme');
  });
});
