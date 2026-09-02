import { beforeEach, describe, expect, it } from 'vitest';
import { isEligible, withExclusionToggled } from './usePlannerPreferences';

describe('toggling an excluded kind', () => {
  it('adds a kind that was not excluded yet', () => {
    expect(withExclusionToggled([], 'fish')).toEqual(['fish']);
  });

  it('removes a kind that was already excluded', () => {
    expect(withExclusionToggled(['fish', 'meat'], 'fish')).toEqual(['meat']);
  });
});

describe('whether a dish passes the preferences', () => {
  it('accepts everything when nothing is excluded and no cap is set', () => {
    expect(
      isEligible(
        { excludedKinds: [], maxPrepMinutes: undefined, maxRepeatsPerWeek: undefined },
        'fish',
        45,
      ),
    ).toBe(true);
  });

  it('refuses a kind that was excluded', () => {
    expect(
      isEligible(
        { excludedKinds: ['fish'], maxPrepMinutes: undefined, maxRepeatsPerWeek: undefined },
        'fish',
        10,
      ),
    ).toBe(false);
  });

  it('refuses a dish that takes longer than the cap', () => {
    expect(
      isEligible(
        { excludedKinds: [], maxPrepMinutes: 20, maxRepeatsPerWeek: undefined },
        'veggie',
        25,
      ),
    ).toBe(false);
  });

  it('accepts a dish right at the cap', () => {
    expect(
      isEligible(
        { excludedKinds: [], maxPrepMinutes: 20, maxRepeatsPerWeek: undefined },
        'veggie',
        20,
      ),
    ).toBe(true);
  });
});

describe('usePlannerPreferences', () => {
  beforeEach((): void => {
    const { preferences } = usePlannerPreferences();
    preferences.value = { excludedKinds: [], maxPrepMinutes: undefined, maxRepeatsPerWeek: undefined };
  });

  it('starts with nothing excluded and no caps', () => {
    const { preferences } = usePlannerPreferences();

    expect(preferences.value).toEqual({
      excludedKinds: [],
      maxPrepMinutes: undefined,
      maxRepeatsPerWeek: undefined,
    });
  });

  it('remembers an excluded kind across reads', () => {
    const { toggleExcluded, preferences } = usePlannerPreferences();

    toggleExcluded('fish');

    expect(usePlannerPreferences().preferences.value.excludedKinds).toEqual(['fish']);
    expect(preferences.value.excludedKinds).toEqual(['fish']);
  });

  it('sets and clears the prep time cap', () => {
    const { setMaxPrepMinutes, preferences } = usePlannerPreferences();

    setMaxPrepMinutes(20);
    expect(preferences.value.maxPrepMinutes).toBe(20);

    setMaxPrepMinutes(undefined);
    expect(preferences.value.maxPrepMinutes).toBeUndefined();
  });

  it('sets the max repeats per week', () => {
    const { setMaxRepeatsPerWeek, preferences } = usePlannerPreferences();

    setMaxRepeatsPerWeek(3);

    expect(preferences.value.maxRepeatsPerWeek).toBe(3);
  });
});
