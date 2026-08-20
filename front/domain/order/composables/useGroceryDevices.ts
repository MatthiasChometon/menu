import type { MyGroceryDevicesQuery } from '#gql';

export type GroceryDevice = MyGroceryDevicesQuery['myGroceryDevices'][number];

export const useGroceryDevices = (): {
  devices: Ref<GroceryDevice[]>;
  isPairing: Ref<boolean>;
  freshToken: Ref<string | undefined>;
  refresh: () => Promise<void>;
  pair: (label: string) => Promise<void>;
  unpair: (deviceId: string) => Promise<void>;
  forgetToken: () => void;
} => {
  const devices = ref<GroceryDevice[]>([]);
  const isPairing = ref(false);
  // Held in memory only, and only until it is dismissed: the server keeps a
  // hash, so nobody can hand it back a second time.
  const freshToken = ref<string | undefined>();

  const refresh = async (): Promise<void> => {
    const result = await GqlMyGroceryDevices().catch((): undefined => undefined);
    devices.value = result?.myGroceryDevices ?? [];
  };

  const pair = async (label: string): Promise<void> => {
    isPairing.value = true;

    try {
      const result = await GqlPairGroceryDevice({ label });
      freshToken.value = result.pairGroceryDevice.token;
      await refresh();
    } finally {
      isPairing.value = false;
    }
  };

  const unpair = async (deviceId: string): Promise<void> => {
    await GqlUnpairGroceryDevice({ deviceId });
    await refresh();
  };

  return {
    devices,
    isPairing,
    freshToken,
    refresh,
    pair,
    unpair,
    forgetToken: (): void => {
      freshToken.value = undefined;
    },
  };
};
