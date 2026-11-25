import { logFailure } from '../infrastructure/logging/failure';
import { jitteredInterval } from '../infrastructure/retry/retry';
import { createGroceryWorker } from '../domain/job/worker';

const POLL_ALARM = 'menu-poll';
const POLL_MINUTES = 5;

// One-shot alarms rather than a fixed period: each is set a little earlier or
// later than the last, so browsers installed together do not claim in step.
const scheduleNextPoll = (): Promise<void> =>
  browser.alarms.create(POLL_ALARM, {
    delayInMinutes: jitteredInterval(POLL_MINUTES * 60_000) / 60_000,
  });

export default defineBackground((): void => {
  const worker = createGroceryWorker();

  browser.runtime.onMessage.addListener((message: { kind?: string; signedIn?: boolean }): void => {
    if (message.kind === 'carrefour-session' && typeof message.signedIn === 'boolean') {
      worker.reportCarrefourSession(message.signedIn).catch(logFailure('session report'));
    }
  });

  browser.alarms.onAlarm.addListener((alarm): void => {
    if (alarm.name !== POLL_ALARM) return;

    // Planned before the run, so a failing run never ends the polling.
    scheduleNextPoll()
      .then((): Promise<void> => worker.runOnce())
      .catch(logFailure('poll'));
  });

  browser.runtime.onInstalled.addListener((): void => {
    scheduleNextPoll().catch(logFailure('poll scheduling'));
  });

  browser.runtime.onStartup.addListener((): void => {
    scheduleNextPoll().catch(logFailure('poll scheduling'));
  });
});
