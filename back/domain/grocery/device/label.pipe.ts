import { BadRequestException, type PipeTransform } from '@nestjs/common';

export const DEVICE_LABEL_MAX_LENGTH = 80;

/** For the name a person gives a browser: trimmed, not empty, short. Anything
 *  else is refused before it reaches the database. */
export const deviceLabelPipe: PipeTransform<unknown, string> = {
  transform: (value: unknown): string => {
    const label = typeof value === 'string' ? value.trim() : '';
    if (label.length === 0 || label.length > DEVICE_LABEL_MAX_LENGTH) {
      throw new BadRequestException(
        `A browser name is 1 to ${DEVICE_LABEL_MAX_LENGTH} characters of text.`,
      );
    }

    return label;
  },
};
