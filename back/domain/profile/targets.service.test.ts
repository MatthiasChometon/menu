import { describe, expect, it } from 'vitest';
import { ActivityLevel, Goal, Sex } from './enum';
import { NutritionTargetsService } from './targets.service';
import { Measurements } from './type';

const service = new NutritionTargetsService();

const measurements = (overrides: Partial<Measurements> = {}): Measurements => ({
  sex: Sex.MALE,
  age: 30,
  heightCm: 175,
  weightKg: 75,
  activityLevel: ActivityLevel.MODERATE,
  goal: Goal.MAINTAIN,
  ...overrides,
});

describe('NutritionTargetsService', () => {
  it("lands on the targets Matthias's menus are built against", () => {
    // His menus aim at 3150 kcal / 165 g protein / 80 g fat, worked out
    // separately. Reproducing them within a few percent is what says the
    // formula is wired correctly. Fibre is left out on purpose: his 55-60 g
    // comes from eating only wholegrain starches, not from a calorie rule.
    const targets = service.calculate({
      sex: Sex.MALE,
      age: 22,
      heightCm: 168,
      weightKg: 72,
      activityLevel: ActivityLevel.ACTIVE,
      goal: Goal.GAIN_MUSCLE,
    });

    expect(targets.kcal).toBeGreaterThan(3150 * 0.95);
    expect(targets.kcal).toBeLessThan(3150 * 1.05);
    expect(targets.protein).toBeGreaterThan(165 * 0.9);
    expect(targets.fat).toBeCloseTo(80, -1);
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
        activityLevel: ActivityLevel.LIGHT,
        goal: Goal.LOSE_FAT,
      }),
    );

    expect((targets.protein * 4) / targets.kcal).toBeLessThanOrEqual(0.36);
    expect(targets.carbs).toBeGreaterThan(100);
  });

  it('raises the allowance with the activity level', () => {
    const sedentary = service.calculate(measurements({ activityLevel: ActivityLevel.SEDENTARY }));
    const veryActive = service.calculate(
      measurements({ activityLevel: ActivityLevel.VERY_ACTIVE }),
    );

    expect(veryActive.kcal).toBeGreaterThan(sedentary.kcal);
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
        activityLevel: ActivityLevel.SEDENTARY,
        goal: Goal.LOSE_FAT,
      }),
    );

    expect(targets.fat).toBeGreaterThanOrEqual(0.8 * 50);
    expect(targets.carbs).toBeGreaterThan(0);
  });

  it('scales fibre with the allowance', () => {
    const small = service.calculate(measurements({ weightKg: 50 }));
    const large = service.calculate(measurements({ weightKg: 100 }));

    expect(large.fiber).toBeGreaterThan(small.fiber);
  });
});
