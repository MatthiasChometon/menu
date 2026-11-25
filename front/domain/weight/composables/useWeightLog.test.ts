import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { myWeightEntries } = vi.hoisted(() => ({ myWeightEntries: vi.fn() }));

mockNuxtImport('GqlMyWeightEntries', () => myWeightEntries);

const settle = async (): Promise<void> => {
  for (let turn = 0; turn < 6; turn += 1) await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach((): void => {
  myWeightEntries.mockReset();
  clearNuxtData();
});

describe('useWeightLog', () => {
  it('reads the diary', async () => {
    myWeightEntries.mockResolvedValue({
      myWeightEntries: [{ id: 'a', date: '2026-08-01', kg: 80 }],
    });
    const { entries, hasFailed } = useWeightLog();
    await settle();

    expect(entries.value).toEqual([{ id: 'a', date: '2026-08-01', kg: 80 }]);
    expect(hasFailed.value).toBe(false);
  });

  it('answers "nothing yet", not a failure, to somebody who is signed out', async () => {
    myWeightEntries.mockRejectedValue({ statusCode: 401, gqlErrors: [] });
    const { entries, hasFailed } = useWeightLog();
    await settle();

    expect(entries.value).toEqual([]);
    expect(hasFailed.value).toBe(false);
  });

  it('says the diary could not be loaded instead of passing it off as empty', async () => {
    myWeightEntries.mockRejectedValue({ statusCode: 500, gqlErrors: [] });
    const { entries, hasFailed } = useWeightLog();
    await settle();

    expect(entries.value).toEqual([]);
    expect(hasFailed.value).toBe(true);
  });
});
