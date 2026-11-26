import { bench, describe } from 'vitest';
import { Appetite, DailyActivity, Goal, Sex, StarchQuality, TrainingType } from './enum';
import { NutritionTargetsService } from './targets.service';

const service = new NutritionTargetsService();

const measurements = {
  sex: Sex.MALE,
  age: 30,
  heightCm: 180,
  weightKg: 80,
  dailyActivity: DailyActivity.SEATED,
  trainingDaysPerWeek: 4,
  trainingType: TrainingType.STRENGTH,
  starchQuality: StarchQuality.MIXED,
  appetite: Appetite.AVERAGE,
  goal: Goal.GAIN_MUSCLE,
};

// Run on every household read, once per member.
describe('nutrition targets', () => {
  bench('calculate for one person', () => {
    service.calculate(measurements);
  });

  bench('calculate for a household of twelve', () => {
    for (let member = 0; member < 12; member += 1) service.calculate(measurements, member);
  });
});
