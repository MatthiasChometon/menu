import { Injectable, Logger } from '@nestjs/common';

import { reasonOf } from '../errors/reason';

// A safety valve, not a budget: one or two admins at 10 s x 3 phases each, or a
// push at 5 s, finish well under it. Past it, shutting down matters more than a
// task that is stuck.
export const SETTLE_CEILING_MS = 120_000;

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
   * Resolves once everything handed to `run` has finished or given up, or after
   * `ceilingMs`, logged, so one stuck task cannot hold the shutdown forever. The
   * database module awaits it before closing the pool: Nest ends the pool in
   * onModuleDestroy, ahead of both shutdown hooks, so draining any later would
   * find the database gone.
   */
  async settled(ceilingMs: number = SETTLE_CEILING_MS): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    const ceiling = new Promise<'ceiling'>((resolve): void => {
      timer = setTimeout((): void => resolve('ceiling'), ceilingMs);
    });

    const outcome = await Promise.race([
      Promise.all(this.inFlight).then((): 'done' => 'done'),
      ceiling,
    ]);
    clearTimeout(timer);
    if (outcome === 'ceiling') {
      this.logger.error(
        `${this.inFlight.size} background task(s) still running after ${ceilingMs} ms.`,
      );
    }
  }

  private async withoutFailing(label: string, work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error: unknown) {
      this.logger.error(`${label}: ${reasonOf(error)}`);
    }
  }
}
