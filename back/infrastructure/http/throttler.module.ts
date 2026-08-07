import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

// The ambient ceiling every route gets. The sign-in routes narrow it themselves,
// because that is where guessing pays off and where each attempt costs a scrypt
// derivation.
const DEFAULT_LIMIT = 120;
const DEFAULT_TTL_MS = 60_000;

export const AUTH_WINDOW_MS = 900_000;
export const AUTH_ATTEMPTS = 10;
export const GOOGLE_ATTEMPTS = 20;

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ ttl: DEFAULT_TTL_MS, limit: DEFAULT_LIMIT }],
        // The contract suite hammers sign-in on purpose; only the test that
        // checks the limiter leaves it armed.
        skipIf: (): boolean => config.get<string>('THROTTLE_SKIP') === 'true',
        // The platform proxy fronts every request. Without reading the
        // forwarded address the tracker would see one caller for the whole
        // internet and throttle every user at once. Paired with trustProxy on
        // the adapter, which is what populates req.ips.
        getTracker: (req): string => {
          const forwarded = req.ips as string[] | undefined;
          return forwarded !== undefined && forwarded.length > 0
            ? (forwarded[0] ?? String(req.ip))
            : String(req.ip);
        },
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class ThrottlerInfrastructureModule {}
