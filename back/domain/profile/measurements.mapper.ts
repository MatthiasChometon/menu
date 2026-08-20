import { Injectable } from '@nestjs/common';
import { Appetite, DailyActivity, Goal, Sex, StarchQuality, TrainingType } from './enum';
import { Measurements } from './type';

/** A row holding the answers, whoever they were given by. */
export type MeasurementsRow = {
  sex: string;
  age: number;
  heightCm: number;
  weightKg: number;
  dailyActivity: string;
  trainingDaysPerWeek: number;
  trainingType: string;
  starchQuality: string;
  appetite: string;
  goal: string;
};

@Injectable()
export class MeasurementsMapper {
  // The columns are plain text, so the enums are restored explicitly rather
  // than asserted onto the row.
  fromRow(row: MeasurementsRow): Measurements {
    return {
      sex: Sex[row.sex as keyof typeof Sex],
      age: row.age,
      heightCm: row.heightCm,
      weightKg: row.weightKg,
      dailyActivity: DailyActivity[row.dailyActivity as keyof typeof DailyActivity],
      trainingDaysPerWeek: row.trainingDaysPerWeek,
      trainingType: TrainingType[row.trainingType as keyof typeof TrainingType],
      starchQuality: StarchQuality[row.starchQuality as keyof typeof StarchQuality],
      appetite: Appetite[row.appetite as keyof typeof Appetite],
      goal: Goal[row.goal as keyof typeof Goal],
    };
  }
}
