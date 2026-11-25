import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { ImprovementImportance } from '#gql/default';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestImprovement } = vi.hoisted(() => ({ requestImprovement: vi.fn() }));

mockNuxtImport('GqlRequestImprovement', () => requestImprovement);

beforeEach((): void => {
  requestImprovement.mockReset();
  useImprovement().open();
});

describe('sending a suggestion', () => {
  it('says it was sent once the API has taken it', async () => {
    requestImprovement.mockResolvedValue({});
    const { send, state } = useImprovement();

    await send(ImprovementImportance.WOULD_HELP, 'A shopping list per day.');

    expect(state.value).toBe('sent');
  });

  it('says it failed, so the idea stays in the box and can be sent again', async () => {
    requestImprovement.mockRejectedValue(new Error('offline'));
    const { send, state } = useImprovement();

    await send(ImprovementImportance.WOULD_HELP, 'A shopping list per day.');

    expect(state.value).toBe('failed');
  });
});
