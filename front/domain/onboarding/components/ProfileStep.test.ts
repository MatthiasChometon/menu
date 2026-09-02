import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileStep from './ProfileStep.vue';

// Plain state, wrapped in a real ref() inside the mock factory: the template
// only auto-unwraps a genuine Vue ref, and a plain { value } stand-in is
// truthy no matter what it holds — see the household test for the same lesson.
const state = vi.hoisted(() => ({ user: undefined as { id: string } | undefined }));

mockNuxtImport('useAuth', () => (): { user: Ref<{ id: string } | undefined> } => ({
  user: ref(state.user),
}));

describe('the onboarding profile step', () => {
  beforeEach(async (): Promise<void> => {
    await useNuxtApp().$i18n.setLocale('fr');
    state.user = undefined;
  });

  it('warns that answers stay on this device when nobody is signed in', async () => {
    const wrapper = await mountSuspended(ProfileStep);

    expect(wrapper.text()).toContain('cet appareil');
  });

  it('says nothing about staying local once somebody is signed in', async () => {
    state.user = { id: 'someone' };
    const wrapper = await mountSuspended(ProfileStep);

    expect(wrapper.text()).not.toContain('cet appareil');
  });
});
