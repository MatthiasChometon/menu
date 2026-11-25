import { logFailure } from '../infrastructure/logging/failure';
import { createGroceryWorker } from '../domain/job/worker';
import { createPollTick, ensurePollAlarm, POLL_ALARM } from '../domain/job/poll';

export default defineBackground((): void => {
  const worker = createGroceryWorker();
  const poll = createPollTick({
    runOnce: (): Promise<void> => worker.runOnce(),
    onError: logFailure('poll'),
  });

  browser.runtime.onMessage.addListener((message: { kind?: string; signedIn?: boolean }): void => {
    if (message.kind === 'carrefour-session' && typeof message.signedIn === 'boolean') {
      worker.reportCarrefourSession(message.signedIn).catch(logFailure('session report'));
    }
  });

  browser.alarms.onAlarm.addListener((alarm): void => {
    if (alarm.name === POLL_ALARM) poll().catch(logFailure('poll'));
  });

  // On every start of the worker, not only on install: an alarm the browser lost
  // is recreated rather than leaving the polling dead.
  ensurePollAlarm(browser.alarms).catch(logFailure('poll scheduling'));
});
