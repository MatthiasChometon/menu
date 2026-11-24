import { Injectable, Logger } from '@nestjs/common';

const reasonOf = (error: unknown): string =>
  error instanceof Error ? error.message : 'unknown error';

/**
 * Work that happens after the response has gone: an announcement mail, a push.
 * It never fails the request that triggered it and never holds it up, so what
 * it does is logged here rather than thrown at somebody who cannot act on it.
 */
@Injectable()
export class BackgroundTasks {
  private readonly logger = new Logger(BackgroundTasks.name);
  private readonly inFlight = new Set<Promise<void>>();

  /** Starts `work` and returns at once. A failure is logged, under `label`, and goes no further. */
  run(label: string, work: () => Promise<void>): void {
    const running = this.withoutFailing(label, work).finally((): void => {
      this.inFlight.delete(running);
    });
    this.inFlight.add(running);
  }

  /**
   * Resolves once everything handed to `run` has finished or given up. The
   * database module awaits it before closing the pool: Nest ends the pool in
   * onModuleDestroy, ahead of both shutdown hooks, so draining any later would
   * find the database gone.
   */
  async settled(): Promise<void> {
    await Promise.all(this.inFlight);
  }

  private async withoutFailing(label: string, work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error: unknown) {
      this.logger.error(`${label}: ${reasonOf(error)}`);
    }
  }
}
