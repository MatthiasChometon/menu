import { Injectable } from '@nestjs/common';
import { Measurements } from './type';

@Injectable()
export class MeasurementsMapper {
  // Whoever gave the answers, only the answers: a household row also carries an owner and a creation date
  // that have no business in a measurement.
  fromRow(row: Measurements): Measurements {
    return {
      sex: row.sex,
      age: row.age,
      heightCm: row.heightCm,
      weightKg: row.weightKg,
      dailyActivity: row.dailyActivity,
      trainingDaysPerWeek: row.trainingDaysPerWeek,
      trainingType: row.trainingType,
      starchQuality: row.starchQuality,
      appetite: row.appetite,
      goal: row.goal,
    };
  }
}
