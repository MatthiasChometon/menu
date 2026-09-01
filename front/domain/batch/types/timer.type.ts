export type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

export type Timer = {
  id: string;
  label: string;
  durationSeconds: number;
  /** Authoritative while idle, paused or done. Ignored while running. */
  remainingSeconds: number;
  /** Epoch ms this timer is due. Set only while running. */
  endAt: number | undefined;
};

export type TimerView = {
  id: string;
  label: string;
  durationSeconds: number;
  remainingSeconds: number;
  status: TimerStatus;
};
