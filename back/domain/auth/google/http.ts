import { HttpModule } from '@nestjs/axios';

// Google answers in well under a second; waiting longer only ties up a request.
export const GOOGLE_TIMEOUT_MS = 5000;

export const googleHttpModule = HttpModule.register({ timeout: GOOGLE_TIMEOUT_MS });
