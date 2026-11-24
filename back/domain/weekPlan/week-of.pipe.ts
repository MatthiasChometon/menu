import { BadRequestException, type PipeTransform } from '@nestjs/common';

const WEEK_OF = /^\d{4}-\d{2}-\d{2}$/;

/** The Monday key of a week, as YYYY-MM-DD and a date that exists. */
export const isWeekOf = (value: string): boolean => {
  if (!WEEK_OF.test(value)) return false;
  const day = new Date(`${value}T00:00:00Z`);

  // 2026-02-30 parses to March 2nd: only a date that reads back as itself exists.
  return !Number.isNaN(day.getTime()) && day.toISOString().startsWith(value);
};

/** For the arguments that name a week: anything else is refused before it reaches the database. */
export const weekOfPipe: PipeTransform<string, string> = {
  transform: (value: string): string => {
    if (typeof value !== 'string' || !isWeekOf(value)) {
      throw new BadRequestException('weekOf must be a YYYY-MM-DD date.');
    }

    return value;
  },
};
