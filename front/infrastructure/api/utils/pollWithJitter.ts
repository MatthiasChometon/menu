import { jitteredInterval } from './backoff';

// Runs `task` again and again, `intervalMs` (give or take a fifth) after the
// previous run ended: a slow run is never overlapped by the next one, and a
// failing run is reported without ending the loop. Returns the way to stop it.
export const pollWithJitter = (
  task: () => Promise<void>,
  intervalMs: number,
  onError: (error: unknown) => void,
): (() => void) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let isStopped = false;

  const schedule = (): void => {
    timer = setTimeout((): void => {
      task()
        .catch(onError)
        .finally((): void => {
          if (!isStopped) schedule();
        });
    }, jitteredInterval(intervalMs));
  };

  schedule();

  return (): void => {
    isStopped = true;
    clearTimeout(timer);
  };
};
