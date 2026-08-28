<script setup lang="ts">
// The shop itself, not the IAM sign-in page: opening it signs the reader in when
// they are not (the shop shows its own "Se connecter"), and does nothing jarring
// when they already are — where the sign-in URL would ask "log out and switch
// account?". It is also the only page the extension checks, so opening it is what
// refreshes the state below.
//
// The app cannot read the Carrefour session itself — it is on another domain — so
// a paired browser's extension reports it, and the state below is the last thing
// it saw. It refreshes on its own while this page is open.
const SHOP_URL = 'https://www.carrefour.fr/';

const { devices, refresh } = useGroceryDevices();
const { locale } = useNuxtApp().$i18n;

// The most recent report across paired browsers: a browser that looked a minute
// ago is a better answer than one that looked yesterday.
const latest = computed((): (typeof devices.value)[number] | undefined =>
  [...devices.value]
    .filter(
      (device): boolean =>
        device.carrefourSignedIn !== null &&
        device.carrefourSignedIn !== undefined &&
        device.carrefourCheckedAt != null,
    )
    .sort(
      (left, right): number =>
        new Date(right.carrefourCheckedAt as string).getTime() -
        new Date(left.carrefourCheckedAt as string).getTime(),
    )[0],
);

const known = computed((): boolean => latest.value !== undefined);
const signedIn = computed((): boolean => latest.value?.carrefourSignedIn === true);

const checkedAt = computed((): string | undefined =>
  latest.value?.carrefourCheckedAt == null
    ? undefined
    : new Date(latest.value.carrefourCheckedAt as string).toLocaleTimeString(locale.value, {
        hour: '2-digit',
        minute: '2-digit',
      }),
);

// Kept fresh while the page is open: the extension reports as the reader signs
// in on another tab, and this should reflect it without a reload.
const REFRESH_MS = 15000;
let timer: ReturnType<typeof setInterval> | undefined;

onMounted((): void => {
  void refresh();
  timer = setInterval((): void => {
    void refresh();
  }, REFRESH_MS);
});

onScopeDispose((): void => {
  if (timer !== undefined) clearInterval(timer);
});
</script>

<template>
  <section class="rounded-xl border border-default p-4">
    <h2 class="font-bold">{{ $t('order.carrefour.title') }}</h2>

    <div
      v-if="known"
      class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1"
      role="status"
    >
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold"
        :class="signedIn ? 'bg-success/10 text-success' : 'bg-error/10 text-error'"
      >
        <UIcon :name="signedIn ? 'i-lucide-circle-check' : 'i-lucide-circle-x'" class="size-4" />
        {{ signedIn ? $t('order.carrefour.connected') : $t('order.carrefour.disconnected') }}
      </span>
      <span v-if="checkedAt !== undefined" class="text-xs text-muted">
        {{ $t('order.carrefour.checkedAt') }} {{ checkedAt }}
      </span>
    </div>
    <p v-else class="mt-2 text-sm text-muted">{{ $t('order.carrefour.unknown') }}</p>

    <p class="mt-2 text-sm text-muted">{{ $t('order.carrefour.lead') }}</p>

    <!-- Offered when the shop is not signed in, or when nobody has looked yet. -->
    <a
      v-if="!signedIn"
      :href="SHOP_URL"
      target="_blank"
      rel="noopener noreferrer"
      class="mt-3 block w-full rounded-lg border border-default px-4 py-2 text-center font-semibold transition-colors hover:bg-elevated/50"
    >
      {{ $t('order.carrefour.open') }}
      <span class="sr-only">{{ $t('accessibility.newWindow') }}</span>
    </a>
  </section>
</template>
