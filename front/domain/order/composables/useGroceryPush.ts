export const useGroceryPush = (): {
  isSupported: Ref<boolean>;
  isSubscribed: Ref<boolean>;
  isBlocked: Ref<boolean>;
  isWorking: Ref<boolean>;
  refresh: () => Promise<void>;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
} => {
  const isSupported = ref(false);
  const isSubscribed = ref(false);
  const isBlocked = ref(false);
  const isWorking = ref(false);

  const registration = async (): Promise<ServiceWorkerRegistration | undefined> =>
    'serviceWorker' in navigator ? navigator.serviceWorker.ready : undefined;

  const refresh = async (): Promise<void> => {
    isSupported.value = 'serviceWorker' in navigator && 'PushManager' in window;
    if (!isSupported.value) return;

    isBlocked.value = Notification.permission === 'denied';
    const existing = await (await registration())?.pushManager.getSubscription();
    isSubscribed.value = existing !== null && existing !== undefined;
  };

  const subscribe = async (): Promise<void> => {
    isWorking.value = true;

    try {
      const key = await GqlGroceryPushKey();
      const publicKey = key.groceryPushKey;
      // No key on the server means push was never set up: there is nothing to
      // subscribe to, and asking the visitor for permission would be rude.
      if (!publicKey) return;

      const permission = await Notification.requestPermission();
      isBlocked.value = permission === 'denied';
      if (permission !== 'granted') return;

      const subscription = await (
        await registration()
      )?.pushManager.subscribe({
        // Notifications are always shown: a push that does nothing visible is
        // what gets a site's permission revoked by the browser.
        userVisibleOnly: true,
        // The base64url key is taken as is; decoding it to bytes ourselves
        // would only add a decoder to get wrong.
        applicationServerKey: publicKey,
      });
      if (subscription === undefined) return;

      const raw = subscription.toJSON();
      await GqlSubscribeToGroceryPush({
        input: {
          endpoint: subscription.endpoint,
          p256dh: raw.keys?.p256dh ?? '',
          auth: raw.keys?.auth ?? '',
        },
      });
      isSubscribed.value = true;
    } finally {
      isWorking.value = false;
    }
  };

  const unsubscribe = async (): Promise<void> => {
    isWorking.value = true;

    try {
      const existing = await (await registration())?.pushManager.getSubscription();
      if (existing === null || existing === undefined) return;

      await GqlUnsubscribeFromGroceryPush({ endpoint: existing.endpoint });
      await existing.unsubscribe();
      isSubscribed.value = false;
    } finally {
      isWorking.value = false;
    }
  };

  return { isSupported, isSubscribed, isBlocked, isWorking, refresh, subscribe, unsubscribe };
};
