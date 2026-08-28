<script setup lang="ts">
// Carrefour's own sign-in page (Carrefour Connect / ForgeRock IAM), in its own
// tab, on its own domain. This site never shows a field for those credentials.
//
// The app cannot read the Carrefour session itself — it is on another domain —
// so a paired browser's extension reports it, and the state below is the last
// thing it saw. It refreshes on its own while this page is open.
const SIGN_IN_URL = 'https://moncompte.carrefour.fr/iam/XUI/#login/';

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
      :href="SIGN_IN_URL"
      target="_blank"
      rel="noopener noreferrer"
      class="mt-3 block w-full rounded-lg border border-default px-4 py-2 text-center font-semibold transition-colors hover:bg-elevated/50"
    >
      {{ $t('order.carrefour.connect') }}
      <span class="sr-only">{{ $t('accessibility.newWindow') }}</span>
    </a>
  </section>
</template>
