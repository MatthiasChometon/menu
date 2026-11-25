import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { BugSeverity } from '#gql/default';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { reportBug } = vi.hoisted(() => ({ reportBug: vi.fn() }));

mockNuxtImport('GqlReportBug', () => reportBug);

beforeEach((): void => {
  reportBug.mockReset();
  useBugReport().open();
});

describe('sending a report', () => {
  it('says it was sent once the API has taken it', async () => {
    reportBug.mockResolvedValue({ reportBug: { id: 'r1' } });
    const { send, state } = useBugReport();

    await send(BugSeverity.ANNOYING, 'The button does nothing.');

    expect(state.value).toBe('sent');
  });

  it('says it failed, so the words stay in the box and can be sent again', async () => {
    reportBug.mockRejectedValue(new Error('offline'));
    const { send, state } = useBugReport();

    await send(BugSeverity.ANNOYING, 'The button does nothing.');

    expect(state.value).toBe('failed');
  });

  it('recovers on a second attempt after a failure', async () => {
    reportBug.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});
    const { send, state } = useBugReport();

    await send(BugSeverity.ANNOYING, 'The button does nothing.');
    await send(BugSeverity.ANNOYING, 'The button does nothing.');

    expect(state.value).toBe('sent');
  });
});
