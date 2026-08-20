export type PushTarget = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type PushMessage = {
  title: string;
  body: string;
  url?: string;
};
