import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Signalements from './signalements.vue';

const { amIAdmin, bugReports, setBugStatus } = vi.hoisted(() => ({
  amIAdmin: vi.fn(),
  bugReports: vi.fn(),
  setBugStatus: vi.fn(),
}));

mockNuxtImport('GqlAmIAdmin', () => amIAdmin);
mockNuxtImport('GqlBugReports', () => bugReports);
mockNuxtImport('GqlSetBugStatus', () => setBugStatus);
mockNuxtImport('useAuth', () => (): { user: Ref<{ id: string }> } => ({
  user: ref({ id: 'u1' }),
}));

const report = {
  id: 'r1',
  severity: 'ANNOYING',
  message: 'The button does nothing.',
  status: 'NEW',
  reportedBy: null,
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
  bugReports.mockReset();
  setBugStatus.mockReset();
  clearNuxtData();
});

describe('the reports screen', () => {
  it('does not tell an administrator the screen is not theirs when the check fails', async () => {
    amIAdmin.mockRejectedValue(new Error('offline'));
    bugReports.mockResolvedValue({ bugReports: [] });
    const wrapper = await mountSuspended(Signalements);
    await settle();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain("réservé à l'administration");
  });

  it('says the list could not be loaded instead of showing it empty', async () => {
    amIAdmin.mockResolvedValue({ amIAdmin: true });
    bugReports.mockRejectedValue(new Error('offline'));
    const wrapper = await mountSuspended(Signalements);
    await settle();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Aucun signalement');
  });

  it('says an action did not go through', async () => {
    amIAdmin.mockResolvedValue({ amIAdmin: true });
    bugReports.mockResolvedValue({ bugReports: [report] });
    setBugStatus.mockRejectedValue(new Error('offline'));
    const wrapper = await mountSuspended(Signalements);
    await settle();

    const fix = wrapper.findAll('button').find((b): boolean => b.text().includes('corrigé'));
    await fix?.trigger('click');
    await settle();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });

  it('shows the date of a report in Paris, whatever the device zone', async () => {
    amIAdmin.mockResolvedValue({ amIAdmin: true });
    bugReports.mockResolvedValue({ bugReports: [report] });
    const wrapper = await mountSuspended(Signalements);
    await settle();

    // 23:30 UTC on the 24th is 00:30 on the 25th in Paris.
    expect(wrapper.text()).toContain('25 novembre');
  });
});
