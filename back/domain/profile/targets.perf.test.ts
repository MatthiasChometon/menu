import { describe, expect, it } from 'vitest';
import { measureMedian } from '../../infrastructure/testing/time-budget';
import { Appetite, DailyActivity, Goal, Sex, StarchQuality, TrainingType } from './enum';
import { NutritionTargetsService } from './targets.service';

const measurements = {
  sex: Sex.FEMALE,
  age: 41,
  heightCm: 168,
  weightKg: 64,
  dailyActivity: DailyActivity.ON_FEET,
  trainingDaysPerWeek: 3,
  trainingType: TrainingType.MIXED,
  starchQuality: StarchQuality.WHOLEGRAIN,
  appetite: Appetite.LARGE,
  goal: Goal.LOSE_FAT,
};

// The figures behind every household read are computed per member, on the request. Ten thousand
// of them must fit in the instantaneous budget (100 ms): a thousand times what one request does.
describe('computing nutrition targets', () => {
  it('stays instantaneous at ten thousand calculations', { retry: 1 }, async () => {
    const service = new NutritionTargetsService();

    const { median } = await measureMedian(
      () => Promise.resolve(''),
      () => {
        for (let call = 0; call < 10_000; call += 1) service.calculate(measurements, call % 100);

        return Promise.resolve();
      },
    );

    expect(median).toBeLessThanOrEqual(100);
  });
});
