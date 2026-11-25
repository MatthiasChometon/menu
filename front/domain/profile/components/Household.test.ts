import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Household from './Household.vue';

// The household is set here rather than fetched: what is under test is what the
// section does with the people it has, not how it got them.
const { state, remove, refresh } = vi.hoisted(() => ({
  state: {
    members: [] as { id: string; name: string; targets: { kcal: number } }[],
    hasFailed: false,
  },
  remove: vi.fn(),
  refresh: vi.fn(),
}));

// Real refs, not look-alikes: the template unwraps a ref and leaves a plain
// object alone, so a stand-in would have the section render its loading
// skeleton for ever and every assertion below would be about nothing.
type Person = { id: string; name: string; targets: { kcal: number } };

mockNuxtImport(
  'useHousehold',
  () =>
    (): {
      members: Ref<Person[]>;
      isLoading: Ref<boolean>;
      hasFailed: Ref<boolean>;
      refresh: () => void;
      add: () => void;
      update: () => void;
      remove: () => void;
    } => ({
      members: ref(state.members),
      isLoading: ref(false),
      hasFailed: ref(state.hasFailed),
      refresh,
      add: vi.fn(),
      update: vi.fn(),
      remove,
    }),
);

const buttonSaying = (
  wrapper: {
    findAll: (
      selector: string,
    ) => { text: () => string; trigger: (event: string) => Promise<void> }[];
  },
  words: string,
): { trigger: (event: string) => Promise<void> } | undefined =>
  wrapper.findAll('button').find((candidate): boolean => candidate.text().includes(words));

beforeEach((): void => {
  state.hasFailed = false;
  remove.mockReset();
  refresh.mockReset();
});

describe('the household section', () => {
  it('says the household could not be loaded, and offers to retry, rather than showing nobody', async () => {
    state.members = [];
    state.hasFailed = true;

    const wrapper = await mountSuspended(Household);

    expect(wrapper.find('[role="alert"]').text()).toContain("n'a pas pu être chargé");
    expect(wrapper.text()).not.toContain("Tu es seul pour l'instant");

    await buttonSaying(wrapper, 'Réessayer')?.trigger('click');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('says so, in an alert, when somebody could not be removed', async () => {
    state.members = [{ id: 'a', name: 'Camille', targets: { kcal: 2100 } }];
    remove.mockRejectedValue(new Error('offline'));
    const wrapper = await mountSuspended(Household);

    await wrapper.find('button[aria-label="Modifier Camille"] ~ button').trigger('click');
    await buttonSaying(wrapper, 'Retirer')?.trigger('click');
    await flushPromises();

    expect(remove).toHaveBeenCalledWith('a');
    expect(wrapper.find('[role="alert"]').text()).toContain("Ça n'a pas fonctionné");
  });

  it('names everybody it is weighing for, and what each of them needs', async () => {
    state.members = [
      { id: 'a', name: 'Camille', targets: { kcal: 2100 } },
      { id: 'b', name: 'Sacha', targets: { kcal: 1800 } },
    ];

    const wrapper = await mountSuspended(Household);

    expect(wrapper.text()).toContain('Camille');
    expect(wrapper.text()).toContain('2100');
    expect(wrapper.text()).toContain('Sacha');
  });

  it('says so plainly when nobody has been added', async () => {
    state.members = [];

    const wrapper = await mountSuspended(Household);

    expect(wrapper.text()).toContain("Tu es seul pour l'instant");
  });

  it('will not go on to the questions until the person has a name', async () => {
    state.members = [];
    const wrapper = await mountSuspended(Household);

    await buttonSaying(wrapper, 'Ajouter une personne')?.trigger('click');

    // The questions are about somebody. Asking them before knowing who would
    // mean a set of answers with nowhere to belong.
    const goOn = wrapper.findAll('button').find((b): boolean => b.text().includes('Continuer'));
    expect(goOn?.attributes('disabled')).toBeDefined();
  });

  it('asks before taking somebody out of the household', async () => {
    state.members = [{ id: 'a', name: 'Camille', targets: { kcal: 2100 } }];
    const wrapper = await mountSuspended(Household);

    await wrapper.find('button[aria-label="Modifier Camille"] ~ button').trigger('click');

    expect(wrapper.text()).toContain('Retirer Camille de ton foyer ?');
    expect(remove).not.toHaveBeenCalled();
  });
});
