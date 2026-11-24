import { Controller, Get, Inject, Logger, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../database/token';

type HealthReport = { status: 'ok' };

// The platform decides whether the service is alive by asking it, and it wants a
// 2xx. Pointing that question at /graphql answered 400, because a GET with no
// query is not a request Apollo has anything to say to — so the service was
// never declared healthy and every call to the API hung.
@Controller('health')
@SkipThrottle()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@Inject(DATABASE) private readonly database: Database) {}

  // Liveness: the process is up and serving, and the database is not asked. A
  // failed liveness check restarts the service, so tying it to the database
  // would turn a passing connection blip into a restart loop.
  @Get()
  checkLiveness(): HealthReport {
    return { status: 'ok' };
  }

  // Readiness: the service can do its work, which needs the database.
  @Get('ready')
  async checkReadiness(): Promise<HealthReport> {
    try {
      await this.database.execute(sql`select 1`);
    } catch (error) {
      this.logger.warn(
        `Database unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException();
    }

    return { status: 'ok' };
  }
}
