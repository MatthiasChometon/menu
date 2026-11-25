import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignInOptions from './SignInOptions.vue';

const { googleEnabled } = vi.hoisted(() => ({ googleEnabled: { value: false } }));

// The Google flag is the back's answer, set here rather than fetched: what is
// under test is what the visitor is offered for each answer.
mockNuxtImport(
  'GqlGoogleEnabled',
  () => (): Promise<{ googleEnabled: boolean }> =>
    Promise.resolve({ googleEnabled: googleEnabled.value }),
);

const props = {
  icon: 'i-lucide-scale',
  title: 'Ton suivi',
  hint: 'Connecte-toi pour le voir.',
  unavailable: 'La connexion est indisponible.',
};

let previousBase = '';

beforeEach(() => {
  previousBase = useRuntimeConfig().public.apiBase;
  useRuntimeConfig().public.apiBase = 'https://api.example.test';
  googleEnabled.value = false;
  // The answer is cached under one key for the whole app: forget it between tests.
  clearNuxtData('google-enabled');
});

afterEach(() => {
  useRuntimeConfig().public.apiBase = previousBase;
});

describe('the sign-in options', () => {
  it('say what the page is for and offer the email form', async () => {
    const wrapper = await mountSuspended(SignInOptions, { props });

    expect(wrapper.text()).toContain('Ton suivi');
    expect(wrapper.text()).toContain('Connecte-toi pour le voir.');
    expect(wrapper.find('input[type="email"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('La connexion est indisponible.');
  });

  it('offer Google only when the back has it configured', async () => {
    const without = await mountSuspended(SignInOptions, { props });
    expect(without.text()).not.toContain('Google');

    googleEnabled.value = true;
    clearNuxtData('google-enabled');
    const wrapper = await mountSuspended(SignInOptions, { props });
    await vi.waitFor((): void => {
      expect(wrapper.text()).toContain('Google');
    });
  });

  it('offer nothing but an explanation when no API is configured', async () => {
    useRuntimeConfig().public.apiBase = '';

    const wrapper = await mountSuspended(SignInOptions, { props });

    expect(wrapper.text()).toContain('La connexion est indisponible.');
    expect(wrapper.find('input[type="email"]').exists()).toBe(false);
  });
});
