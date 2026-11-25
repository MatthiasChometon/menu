import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Ameliorations from './ameliorations.vue';

const { amIAdmin, improvementRequests, setImprovementStatus } = vi.hoisted(() => ({
  amIAdmin: vi.fn(),
  improvementRequests: vi.fn(),
  setImprovementStatus: vi.fn(),
}));

mockNuxtImport('GqlAmIAdmin', () => amIAdmin);
mockNuxtImport('GqlImprovementRequests', () => improvementRequests);
mockNuxtImport('GqlSetImprovementStatus', () => setImprovementStatus);
mockNuxtImport('useAuth', () => (): { user: Ref<{ id: string }> } => ({
  user: ref({ id: 'u1' }),
}));

const report = {
  id: 'r1',
  importance: 'WOULD_HELP',
  message: 'A shopping list.',
  status: 'NEW',
  requestedBy: null,
  reporterBlocked: false,
  createdAt: '2026-11-24T23:30:00.000Z',
  context: { page: '/semaine', userAgent: 'UA', viewport: '800x600', locale: 'fr' },
};

const settle = async (): Promise<void> => {
  for (let turn = 0; turn < 6; turn += 1) await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach((): void => {
  amIAdmin.mockReset();
  improvementRequests.mockReset();
  setImprovementStatus.mockReset();
  clearNuxtData();
});

describe('the reports screen', () => {
  it('does not tell an administrator the screen is not theirs when the check fails', async () => {
    amIAdmin.mockRejectedValue(new Error('offline'));
    improvementRequests.mockResolvedValue({ improvementRequests: [] });
    const wrapper = await mountSuspended(Ameliorations);
    await settle();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain("réservé à l'administration");
  });

  it('says the list could not be loaded instead of showing it empty', async () => {
    amIAdmin.mockResolvedValue({ amIAdmin: true });
    improvementRequests.mockRejectedValue(new Error('offline'));
    const wrapper = await mountSuspended(Ameliorations);
    await settle();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Aucune suggestion');
  });

  it('says an action did not go through', async () => {
    amIAdmin.mockResolvedValue({ amIAdmin: true });
    improvementRequests.mockResolvedValue({ improvementRequests: [report] });
    setImprovementStatus.mockRejectedValue(new Error('offline'));
    const wrapper = await mountSuspended(Ameliorations);
    await settle();

    const fix = wrapper.findAll('button').find((b): boolean => b.text().includes('Prévu'));
    await fix?.trigger('click');
    await settle();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });

  it('shows the date of a report in Paris, whatever the device zone', async () => {
    amIAdmin.mockResolvedValue({ amIAdmin: true });
    improvementRequests.mockResolvedValue({ improvementRequests: [report] });
    const wrapper = await mountSuspended(Ameliorations);
    await settle();

    // 23:30 UTC on the 24th is 00:30 on the 25th in Paris.
    expect(wrapper.text()).toContain('25 novembre');
  });
});
