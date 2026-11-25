import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { myProfile } = vi.hoisted(() => ({ myProfile: vi.fn() }));

mockNuxtImport('GqlMyProfile', () => myProfile);

const settle = async (): Promise<void> => {
  for (let turn = 0; turn < 6; turn += 1) await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach((): void => {
  myProfile.mockReset();
  clearNuxtData();
});

describe('useProfile', () => {
  it('reads the saved answers', async () => {
    myProfile.mockResolvedValue({ myProfile: { age: 40 } });
    const { profile, hasAnswered, hasFailed } = useProfile();
    await settle();

    expect(profile.value).toEqual({ age: 40 });
    expect(hasAnswered.value).toBe(true);
    expect(hasFailed.value).toBe(false);
  });

  it('answers "no answers yet", not a failure, to somebody who is signed out', async () => {
    myProfile.mockRejectedValue({
      statusCode: 200,
      gqlErrors: [{ extensions: { code: 'UNAUTHENTICATED' } }],
    });
    const { hasAnswered, hasFailed } = useProfile();
    await settle();

    expect(hasAnswered.value).toBe(false);
    expect(hasFailed.value).toBe(false);
  });

  it('says the read failed instead of passing it off as "no answers yet"', async () => {
    myProfile.mockRejectedValue({ statusCode: 500, gqlErrors: [] });
    const { hasAnswered, hasFailed } = useProfile();
    await settle();

    expect(hasAnswered.value).toBe(false);
    expect(hasFailed.value).toBe(true);
  });
});
