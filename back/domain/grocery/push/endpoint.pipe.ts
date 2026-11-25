import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { pushConstraints } from './utils';

/** For the endpoint a browser unsubscribes: the https address its push service
 *  gave it, not longer than what a subscription may store. */
export const pushEndpointPipe: PipeTransform<unknown, string> = {
  transform: (value: unknown): string => {
    if (typeof value !== 'string' || value.length > pushConstraints().endpointMaxLength) {
      throw new BadRequestException('Not a push endpoint.');
    }

    try {
      if (new URL(value).protocol === 'https:') return value;
    } catch {
      // Falls through to the refusal below.
    }

    throw new BadRequestException('Not a push endpoint.');
  },
};
