import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { isISO8601 } from 'class-validator';

/** A calendar day as YYYY-MM-DD that exists. Not necessarily a Monday: the plan never checked. */
export const isWeekOf = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && isISO8601(value, { strict: true });

/** For the arguments that name a week: anything else is refused before it reaches the database. */
export const weekOfPipe: PipeTransform<unknown, string> = {
  transform: (value: unknown): string => {
    if (typeof value !== 'string' || !isWeekOf(value)) {
      throw new BadRequestException('weekOf must be a YYYY-MM-DD date.');
    }

    return value;
  },
};
