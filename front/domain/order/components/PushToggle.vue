<script setup lang="ts">
const { isSupported, isSubscribed, isBlocked, isWorking, refresh, subscribe, unsubscribe } =
  useGroceryPush();

const { reportError } = useErrorReporting();
const hasFailed = ref(false);

// Every push step can be refused by the browser or the network: the reader is
// told, and the button is usable again.
const attempt = async (action: () => Promise<void>): Promise<void> => {
  hasFailed.value = false;

  try {
    await action();
  } catch (failure) {
    reportError('order:push', failure);
    hasFailed.value = true;
  }
};

const toggle = async (): Promise<void> => {
  await attempt(isSubscribed.value ? unsubscribe : subscribe);
};

onMounted(async (): Promise<void> => {
  await attempt(refresh);
});
</script>

<template>
  <section v-if="isSupported" class="rounded-xl border border-default p-4">
    <h2 class="font-bold">{{ $t('order.push.title') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('order.push.lead') }}</p>

    <p v-if="isBlocked" class="mt-2 text-sm text-muted">{{ $t('order.push.blocked') }}</p>

    <button
      v-else
      type="button"
      class="mt-3 w-full rounded-lg border border-default px-4 py-2 font-semibold disabled:opacity-60"
      :disabled="isWorking"
      @click="toggle"
    >
      {{ isSubscribed ? $t('order.push.off') : $t('order.push.on') }}
    </button>
    <p v-if="hasFailed" class="mt-2 text-sm text-error" role="alert">
      {{ $t('order.push.failed') }}
    </p>
  </section>
</template>
