import { ConfigService } from '@nestjs/config';

// A configured address is as likely to end in a slash as not, and the double
// slash it would otherwise make in a mailed link is not the same URL.
export const frontUrl = (config: ConfigService): string =>
  config.getOrThrow<string>('FRONT_URL').replace(/\/+$/, '');
