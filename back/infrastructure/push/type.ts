export type PushRecipient = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type PushDelivery = {
  title: string;
  body: string;
  url?: string;
};
