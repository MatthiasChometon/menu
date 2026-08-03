import { describe, expect, it } from 'vitest';
import { Appetite, DailyActivity, Goal, Sex, StarchQuality, TrainingType } from './enum';
import { NutritionTargetsService } from './targets.service';
import { Measurements } from './type';

const service = new NutritionTargetsService();

const measurements = (overrides: Partial<Measurements> = {}): Measurements => ({
  sex: Sex.MALE,
  age: 30,
  heightCm: 175,
  weightKg: 75,
  dailyActivity: DailyActivity.SEATED,
  trainingDaysPerWeek: 3,
  trainingType: TrainingType.MIXED,
  starchQuality: StarchQuality.MIXED,
  appetite: Appetite.AVERAGE,
  goal: Goal.MAINTAIN,
  ...overrides,
});

// Nothing below is special-cased: these figures come out of the same formula as
// everyone else's, from the answers the form would collect.
const dailyLifter = (): Measurements =>
  measurements({
    age: 22,
    heightCm: 168,
    weightKg: 72,
    dailyActivity: DailyActivity.SEATED,
    trainingDaysPerWeek: 7,
    trainingType: TrainingType.STRENGTH,
    starchQuality: StarchQuality.WHOLEGRAIN,
    appetite: Appetite.SMALL,
    goal: Goal.GAIN_MUSCLE,
  });

describe('NutritionTargetsService', () => {
  it('lands on the targets the menus are built against', () => {
    // Those menus aim at 3150 kcal / 165 g protein / 80 g fat / 55-60 g fibre,
    // worked out separately. Reproducing them within a few percent is what says
    // the formula is wired correctly.
    const targets = service.calculate(dailyLifter());

    expect(targets.kcal).toBeGreaterThan(3150 * 0.95);
    expect(targets.kcal).toBeLessThan(3150 * 1.05);
    expect(targets.protein).toBeGreaterThan(165 * 0.9);
    expect(targets.fat).toBeCloseTo(80, -1);
    expect(targets.fiber).toBeGreaterThanOrEqual(55);
    expect(targets.fiber).toBeLessThanOrEqual(60);
  });

  it('separates the day job from the training', () => {
    // The whole point of asking two questions: a desk job with daily sessions
    // must outrank a standing job with none.
    const deskAndTraining = service.calculate(
      measurements({
        dailyActivity: DailyActivity.SEATED,
        trainingDaysPerWeek: 6,
        trainingType: TrainingType.STRENGTH,
      }),
    );
    const onFeetNoTraining = service.calculate(
      measurements({
        dailyActivity: DailyActivity.ON_FEET,
        trainingDaysPerWeek: 0,
        trainingType: TrainingType.NONE,
      }),
    );

    expect(deskAndTraining.kcal).toBeGreaterThan(onFeetNoTraining.kcal);
  });

  it('raises the allowance with each weekly session', () => {
    const twice = service.calculate(measurements({ trainingDaysPerWeek: 2 }));
    const sixTimes = service.calculate(measurements({ trainingDaysPerWeek: 6 }));

    expect(sixTimes.kcal).toBeGreaterThan(twice.kcal);
  });

  it('caps the activity factor so extreme answers stay believable', () => {
    const plausible = service.calculate(
      measurements({
        dailyActivity: DailyActivity.PHYSICAL,
        trainingDaysPerWeek: 7,
        trainingType: TrainingType.CARDIO,
      }),
    );
    const absurd = service.calculate(
      measurements({
        dailyActivity: DailyActivity.PHYSICAL,
        trainingDaysPerWeek: 14,
        trainingType: TrainingType.CARDIO,
      }),
    );

    expect(absurd.kcal).toBe(plausible.kcal);
  });

  it('sets fibre from the starches actually eaten', () => {
    const wholegrain = service.calculate(measurements({ starchQuality: StarchQuality.WHOLEGRAIN }));
    const refined = service.calculate(measurements({ starchQuality: StarchQuality.REFINED }));

    expect(wholegrain.fiber).toBeGreaterThan(refined.fiber);
  });

  it('gives a woman a lower allowance than a man of the same build', () => {
    const shared = { age: 55, heightCm: 165, weightKg: 65 };

    const woman = service.calculate(measurements({ ...shared, sex: Sex.FEMALE }));
    const man = service.calculate(measurements({ ...shared, sex: Sex.MALE }));

    expect(woman.kcal).toBeLessThan(man.kcal);
  });

  it('orders the goals from losing to gaining', () => {
    const lose = service.calculate(measurements({ goal: Goal.LOSE_FAT }));
    const maintain = service.calculate(measurements({ goal: Goal.MAINTAIN }));
    const gain = service.calculate(measurements({ goal: Goal.GAIN_MUSCLE }));

    expect(lose.kcal).toBeLessThan(maintain.kcal);
    expect(maintain.kcal).toBeLessThan(gain.kcal);
  });

  it('raises protein when losing fat, to protect muscle in a deficit', () => {
    const lose = service.calculate(measurements({ goal: Goal.LOSE_FAT }));
    const maintain = service.calculate(measurements({ goal: Goal.MAINTAIN }));

    expect(lose.protein).toBeGreaterThan(maintain.protein);
  });

  it('never lets protein crowd out the rest of the plate', () => {
    // A heavier person on a slimming allowance: 2.4 g/kg of their body weight
    // would be 46% of the day's calories and leave barely any carbohydrate,
    // which no one can actually eat week after week.
    const targets = service.calculate(
      measurements({
        sex: Sex.FEMALE,
        age: 55,
        heightCm: 165,
        weightKg: 70,
        dailyActivity: DailyActivity.SEATED,
        trainingDaysPerWeek: 2,
        trainingType: TrainingType.CARDIO,
        goal: Goal.LOSE_FAT,
      }),
    );

    expect((targets.protein * 4) / targets.kcal).toBeLessThanOrEqual(0.36);
    expect(targets.carbs).toBeGreaterThan(100);
  });

  it('splits the whole allowance across the three macros', () => {
    const targets = service.calculate(measurements());

    const fromMacros = targets.protein * 4 + targets.fat * 9 + targets.carbs * 4;

    // Each macro is rounded to the gram, and a gram of fat carries 9 kcal, so
    // the two totals can drift by about a dozen kcal without anything being off.
    expect(Math.abs(fromMacros - targets.kcal)).toBeLessThanOrEqual(12);
  });

  it('keeps fat above the hormonal floor on a small allowance', () => {
    // A small, older, dieting woman: the case where the standard fat share
    // would swallow the carbohydrates.
    const targets = service.calculate(
      measurements({
        sex: Sex.FEMALE,
        age: 70,
        heightCm: 150,
        weightKg: 50,
        dailyActivity: DailyActivity.SEATED,
        trainingDaysPerWeek: 0,
        trainingType: TrainingType.NONE,
        goal: Goal.LOSE_FAT,
      }),
    );

    expect(targets.fat).toBeGreaterThanOrEqual(0.8 * 50);
    expect(targets.carbs).toBeGreaterThan(0);
  });
});
