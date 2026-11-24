export type PushTarget = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};
