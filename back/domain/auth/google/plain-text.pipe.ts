import { BadRequestException, type PipeTransform } from '@nestjs/common';

/** A query value that must be one piece of text: `?state=a&state=b` arrives as
 *  an array and is refused here rather than read as text further down. Absent
 *  stays absent, since Google sends neither value when the person refuses. */
export const plainText = (maxLength: number): PipeTransform<unknown, string | undefined> => {
  return {
    transform: (value: unknown): string | undefined => {
      if (value === undefined) return undefined;
      if (typeof value !== 'string' || value.length > maxLength) {
        throw new BadRequestException('Malformed sign-in parameters.');
      }

      return value;
    },
  };
};
