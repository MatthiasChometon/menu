import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { householdMembers } = vi.hoisted(() => ({ householdMembers: vi.fn() }));

mockNuxtImport('GqlHouseholdMembers', () => householdMembers);

const settle = async (): Promise<void> => {
  for (let turn = 0; turn < 6; turn += 1) await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach((): void => {
  householdMembers.mockReset();
  clearNuxtData();
});

describe('useHousehold', () => {
  it('answers an empty household, not a failure, to somebody who is signed out', async () => {
    householdMembers.mockRejectedValue({ statusCode: 401, gqlErrors: [] });
    const { members, hasFailed } = useHousehold();
    await settle();

    expect(members.value).toEqual([]);
    expect(hasFailed.value).toBe(false);
  });

  it('says the household could not be loaded instead of passing it off as empty', async () => {
    householdMembers.mockRejectedValue({ statusCode: 500, gqlErrors: [] });
    const { members, hasFailed } = useHousehold();
    await settle();

    expect(members.value).toEqual([]);
    expect(hasFailed.value).toBe(true);
  });

  it('treats a reply without the list as an empty household, regression guard, because the e2e API stub answers "data: {}" and the page crashed on undefined.map', async () => {
    householdMembers.mockResolvedValue({});
    const { members, hasFailed } = useHousehold();
    await settle();

    expect(members.value).toEqual([]);
    expect(hasFailed.value).toBe(false);
  });
});
