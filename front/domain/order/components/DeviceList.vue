<script setup lang="ts">
const { devices, isPairing, freshToken, refresh, pair, unpair, forgetToken } = useGroceryDevices();
const { extensionHere, justPaired, sendPairing } = useExtensionBridge();
const config = useRuntimeConfig();
const label = ref('');

// The API address the extension should talk to — the same one this app uses.
const endpoint = computed((): string => `${config.public.apiBase}/graphql`);

const submit = async (): Promise<void> => {
  const named = label.value.trim();
  if (named === '') return;

  await pair(named);
  // Hand the token straight to the extension when it is installed here: no popup,
  // no copy-paste. When it is not, the token below is the fallback.
  if (freshToken.value !== undefined) sendPairing(endpoint.value, freshToken.value);
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

    <!-- The extension announces itself on the page, so pairing needs no popup. -->
    <p v-if="extensionHere && !justPaired" class="mt-2 flex items-center gap-1.5 text-xs text-primary">
      <UIcon name="i-lucide-plug-zap" class="size-3.5 shrink-0" />
      {{ $t('order.device.extensionHere') }}
    </p>

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

    <!-- Paired straight into the extension: nothing to copy. -->
    <div v-if="justPaired" class="mt-3 flex items-center gap-2 rounded-lg border border-primary p-3">
      <UIcon name="i-lucide-circle-check" class="size-4 shrink-0 text-success" />
      <p class="text-sm font-semibold">{{ $t('order.device.autoPaired') }}</p>
    </div>

    <!-- Fallback when the extension is not here to catch the token: show it once. -->
    <div v-else-if="freshToken" class="mt-3 rounded-lg border border-primary p-3">
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
