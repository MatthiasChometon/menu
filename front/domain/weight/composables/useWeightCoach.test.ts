import { describe, expect, it } from 'vitest';

const entry = (date: string, kg: number): WeightEntry => ({ id: date, date, kg });

describe('useWeightCoach', () => {
  it('asks to wait with fewer than two weigh-ins', () => {
    const { adviceOf } = useWeightCoach();

    expect(adviceOf([]).status).toBe('notEnoughData');
    expect(adviceOf([entry('2026-08-01', 80)]).status).toBe('notEnoughData');
  });

  it('asks to wait when every weigh-in shares the same date', () => {
    const { adviceOf } = useWeightCoach();

    const advice = adviceOf([entry('2026-08-01', 80), entry('2026-08-01', 80.2)]);

    expect(advice.status).toBe('notEnoughData');
  });

  it('reads a stall below the target pace and suggests eating a little more', () => {
    const { adviceOf } = useWeightCoach();

    // 100 g over two weeks: well under the 300-400 g/week target.
    const advice = adviceOf([entry('2026-08-01', 80), entry('2026-08-15', 80.1)]);

    expect(advice.status).toBe('tooSlow');
    expect(advice.kcalAdjustment).toBeGreaterThan(0);
  });

  it('reads a climb above the target pace and suggests eating a little less', () => {
    const { adviceOf } = useWeightCoach();

    // 1.4 kg over two weeks: well over the 300-400 g/week target.
    const advice = adviceOf([entry('2026-08-01', 80), entry('2026-08-15', 81.4)]);

    expect(advice.status).toBe('tooFast');
    expect(advice.kcalAdjustment).toBeLessThan(0);
  });

  it('confirms the trajectory when the pace sits inside the target', () => {
    const { adviceOf } = useWeightCoach();

    // 700 g over two weeks: 350 g/week, right in the 300-400 g range.
    const advice = adviceOf([entry('2026-08-01', 80), entry('2026-08-15', 80.7)]);

    expect(advice.status).toBe('onTrack');
    expect(advice.kcalAdjustment).toBeUndefined();
  });

  it('reports the actual weekly rate alongside the verdict', () => {
    const { adviceOf } = useWeightCoach();

    const advice = adviceOf([entry('2026-08-01', 80), entry('2026-08-08', 80.35)]);

    expect(advice.weeklyRateKg).toBeCloseTo(0.35);
  });

  it('judges only the recent weeks, ignoring an older stall', () => {
    const { adviceOf } = useWeightCoach();

    const advice = adviceOf([
      entry('2026-06-01', 78),
      entry('2026-07-01', 78.05),
      entry('2026-08-01', 80),
      entry('2026-08-15', 80.7),
    ]);

    expect(advice.status).toBe('onTrack');
  });
});
