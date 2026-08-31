import { createGroceryWorker } from '../domain/job/worker';

const POLL_ALARM = 'menu-poll';
const POLL_MINUTES = 5;

export default defineBackground((): void => {
  const worker = createGroceryWorker();

  browser.runtime.onMessage.addListener((message: { kind?: string; signedIn?: boolean }): void => {
    if (message.kind === 'carrefour-session' && typeof message.signedIn === 'boolean') {
      void worker.reportCarrefourSession(message.signedIn);
    }
  });

  browser.alarms.onAlarm.addListener((alarm): void => {
    if (alarm.name === POLL_ALARM) void worker.runOnce();
  });

  browser.runtime.onInstalled.addListener((): void => {
    void browser.alarms.create(POLL_ALARM, { periodInMinutes: POLL_MINUTES });
  });

  browser.runtime.onStartup.addListener((): void => {
    void browser.alarms.create(POLL_ALARM, { periodInMinutes: POLL_MINUTES });
  });
});
