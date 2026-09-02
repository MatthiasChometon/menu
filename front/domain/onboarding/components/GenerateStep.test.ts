import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GenerateStep from './GenerateStep.vue';

// Plain state, wrapped in a real ref() inside each mock factory below: the
// template only auto-unwraps a genuine Vue ref, and a plain { value } stand-in
// is truthy no matter what it holds — see the household test for the same
// lesson.
const state = vi.hoisted(() => ({
  user: undefined as { id: string } | undefined,
  isGenerating: false,
  hasFailed: false,
  generate: vi.fn(async (): Promise<void> => {}),
}));

type AuthStub = { user: Ref<{ id: string } | undefined> };
type GenerateStub = {
  isGenerating: Ref<boolean>;
  hasFailed: Ref<boolean>;
  generate: () => Promise<void>;
};

mockNuxtImport('useAuth', () => (): AuthStub => ({ user: ref(state.user) }));
mockNuxtImport('useGenerateFirstWeek', () => (): GenerateStub => ({
  isGenerating: ref(state.isGenerating),
  hasFailed: ref(state.hasFailed),
  generate: state.generate,
}));

describe('the onboarding generate step', () => {
  beforeEach(async (): Promise<void> => {
    await useNuxtApp().$i18n.setLocale('fr');
    state.user = undefined;
    state.isGenerating = false;
    state.hasFailed = false;
    state.generate.mockClear();
  });

  it('offers to sign in when nobody is', async () => {
    const wrapper = await mountSuspended(GenerateStep);

    expect(wrapper.text()).toContain('Connecte-toi');
  });

  it('says nothing about signing in once somebody already is', async () => {
    state.user = { id: 'someone' };
    const wrapper = await mountSuspended(GenerateStep);

    expect(wrapper.text()).not.toContain('Connecte-toi');
  });

  it('generates the week on click', async () => {
    const wrapper = await mountSuspended(GenerateStep);

    await wrapper.find('button').trigger('click');

    expect(state.generate).toHaveBeenCalledOnce();
  });

  it('shows the error when the last attempt did not go through', async () => {
    state.hasFailed = true;
    const wrapper = await mountSuspended(GenerateStep);

    expect(wrapper.text()).toContain("n'a pas abouti");
  });
});
