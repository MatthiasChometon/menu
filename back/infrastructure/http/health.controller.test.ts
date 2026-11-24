import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { Database } from '../database/token';
import { HealthController } from './health.controller';

const databaseAnswering = (outcome: 'up' | 'down'): Database =>
  ({
    execute: (): Promise<unknown> =>
      outcome === 'up' ? Promise.resolve([]) : Promise.reject(new Error('connection refused')),
  }) as unknown as Database;

describe('the health checks', () => {
  it('reports the process alive without asking the database', () => {
    const controller = new HealthController(databaseAnswering('down'));

    expect(controller.checkLiveness()).toEqual({ status: 'ok' });
  });

  it('reports ready when the database answers', async () => {
    const controller = new HealthController(databaseAnswering('up'));

    await expect(controller.checkReadiness()).resolves.toEqual({ status: 'ok' });
  });

  it('reports not ready, as a 503, when the database does not answer', async () => {
    const controller = new HealthController(databaseAnswering('down'));

    await expect(controller.checkReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
