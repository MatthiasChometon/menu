import { beforeEach, describe, expect, it } from 'vitest';

describe('useOnboardingStatus', () => {
  beforeEach((): void => {
    useOnboardingStatus().reset();
  });

  it('starts undecided, so the walkthrough is offered', () => {
    expect(useOnboardingStatus().isDismissed.value).toBe(false);
  });

  it('remembers being dismissed across reads', () => {
    const { dismiss } = useOnboardingStatus();

    dismiss();

    expect(useOnboardingStatus().isDismissed.value).toBe(true);
  });

  it('can be reset back to undecided', () => {
    const { dismiss, reset } = useOnboardingStatus();
    dismiss();

    reset();

    expect(useOnboardingStatus().isDismissed.value).toBe(false);
  });
});
