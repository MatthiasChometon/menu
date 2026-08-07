import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

// The platform decides whether the service is alive by asking it, and it wants a
// 2xx. Pointing that question at /graphql answered 400, because a GET with no
// query is not a request Apollo has anything to say to — so the service was
// never declared healthy and every call to the API hung.
//
// Deliberately a liveness check and not a readiness one: it says the process is
// up and serving, and asks the database nothing. A failed check restarts the
// service, so tying it to the database would turn a passing connection blip into
// a restart loop.
@Controller('health')
@SkipThrottle()
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
