import { Injectable } from '@nestjs/common';
import { DailyActivity, Goal, StarchQuality, TrainingType } from './enum';
import { NutritionTargets } from './model';
import { Measurements } from './type';
import {
  dailyActivityBase,
  fatPerKg,
  fiberPerThousandKcal,
  goalCalorieAdjustments,
  maxActivityFactor,
  maxProteinShareOfKcal,
  proteinPerKg,
  restingEnergy,
  trainingIncrementPerSession,
} from './utils';

const KCAL_PER_GRAM = { protein: 4, fat: 9, carbs: 4 };

@Injectable()
export class NutritionTargetsService {
  calculate(measurements: Measurements): NutritionTargets {
    const { sex, age, heightCm, weightKg, starchQuality, goal } = measurements;

    const resting = restingEnergy(sex, age, heightCm, weightKg);
    const maintenance = resting * this.activityFactorFor(measurements);
    const kcal = maintenance * (1 + goalCalorieAdjustments()[goal]);

    const protein = this.proteinFor(kcal, weightKg, goal);
    const fat = this.fatFor(kcal, weightKg, protein);
    // Carbohydrates take whatever calories protein and fat leave: they are the
    // adjustment variable, not a target of their own.
    const carbs = (kcal - protein * KCAL_PER_GRAM.protein - fat * KCAL_PER_GRAM.fat) / 4;

    return {
      kcal: Math.round(kcal),
      protein: Math.round(protein),
      fat: Math.round(fat),
      carbs: Math.round(carbs),
      fiber: Math.round((kcal / 1000) * this.fiberRateFor(starchQuality)),
    };
  }

  private activityFactorFor({
    dailyActivity,
    trainingDaysPerWeek,
    trainingType,
  }: {
    dailyActivity: DailyActivity;
    trainingDaysPerWeek: number;
    trainingType: TrainingType;
  }): number {
    const base = dailyActivityBase()[dailyActivity];
    const fromTraining = trainingDaysPerWeek * trainingIncrementPerSession()[trainingType];

    return Math.min(base + fromTraining, maxActivityFactor());
  }

  private fiberRateFor(starchQuality: StarchQuality): number {
    return fiberPerThousandKcal()[starchQuality];
  }

  private proteinFor(kcal: number, weightKg: number, goal: Goal): number {
    const fromWeight = proteinPerKg()[goal] * weightKg;
    const ceiling = (kcal * maxProteinShareOfKcal()) / KCAL_PER_GRAM.protein;

    return Math.min(fromWeight, ceiling);
  }

  private fatFor(kcal: number, weightKg: number, protein: number): number {
    const { standard, floor } = fatPerKg();
    // On a small allowance the standard share can leave no room for
    // carbohydrates, so fat gives way down to its health floor.
    const remaining = kcal - protein * KCAL_PER_GRAM.protein;
    const affordable = (remaining * 0.45) / KCAL_PER_GRAM.fat;

    return Math.max(floor * weightKg, Math.min(standard * weightKg, affordable));
  }
}
