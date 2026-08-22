<script setup lang="ts">
const { devices, isPairing, freshToken, refresh, pair, unpair, forgetToken } = useGroceryDevices();
const label = ref('');

const submit = async (): Promise<void> => {
  const named = label.value.trim();
  if (named === '') return;

  await pair(named);
  label.value = '';
};

const formatted = (at: string | null | undefined): string =>
  at === null || at === undefined
    ? useNuxtApp().$i18n.t('order.device.never')
    : new Date(at).toLocaleDateString(useNuxtApp().$i18n.locale.value);

onMounted((): void => {
  void refresh();
});
</script>

<template>
  <section class="rounded-xl border border-default p-4">
    <h2 class="font-bold">{{ $t('order.device.title') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('order.device.lead') }}</p>

    <!-- Stacked on a phone: side by side, the field took what it needed and
         left the button three lines tall, its label broken across them. -->
    <form class="mt-3 flex flex-col gap-2 sm:flex-row" @submit.prevent="submit">
      <label class="sr-only" for="device-label">{{ $t('order.device.label') }}</label>
      <input
        id="device-label"
        v-model="label"
        type="text"
        class="flex-1 rounded-lg border border-default px-3 py-2"
        :placeholder="$t('order.device.labelPlaceholder')"
      />
      <button
        type="submit"
        class="whitespace-nowrap rounded-lg bg-primary px-4 py-2 font-semibold text-inverted disabled:opacity-60"
        :disabled="isPairing || label.trim() === ''"
      >
        {{ isPairing ? $t('order.device.pairing') : $t('order.device.pair') }}
      </button>
    </form>

    <div v-if="freshToken" class="mt-3 rounded-lg border border-primary p-3">
      <h3 class="text-sm font-semibold">{{ $t('order.device.tokenTitle') }}</h3>
      <code class="mt-1 block break-all text-xs">{{ freshToken }}</code>
      <p class="mt-1 text-xs text-muted">{{ $t('order.device.tokenHint') }}</p>
      <button type="button" class="mt-2 text-sm underline" @click="forgetToken">
        {{ $t('order.device.dismiss') }}
      </button>
    </div>

    <p v-if="devices.length === 0" class="mt-3 text-sm text-muted">
      {{ $t('order.device.empty') }}
    </p>
    <ul v-else class="mt-3 space-y-2">
      <li
        v-for="device in devices"
        :key="device.id"
        class="flex items-baseline justify-between gap-3"
      >
        <span>
          <span class="font-medium">{{ device.label }}</span>
          <span class="ml-2 text-xs text-muted">
            {{ $t('order.device.lastSeen') }} {{ formatted(device.lastSeenAt) }}
          </span>
        </span>
        <button type="button" class="text-sm underline" @click="unpair(device.id)">
          {{ $t('order.device.unpair') }}
        </button>
      </li>
    </ul>
  </section>
</template>
