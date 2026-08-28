<script setup lang="ts">
// The one screen that turns "auto basket" on: a three-step assistant that shows
// only the next thing to do and ticks each step off on its own. Everything it
// needs is already in the composables — this reorders it into a path.
const { extensionHere, justPaired, sendPairing } = useExtensionBridge();
const { devices, isPairing, freshToken, refresh, pair, unpair } = useGroceryDevices();
const config = useRuntimeConfig();
const { t, locale } = useNuxtApp().$i18n;

// Store pages, placeholders until the listings exist. Edge takes the Chrome one.
const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/menu-courses-carrefour';
const FIREFOX_STORE_URL = 'https://addons.mozilla.org/fr/firefox/addon/menu-courses-carrefour/';
// The shop itself, not the IAM sign-in page: it signs the reader in when needed,
// does nothing jarring when they already are, and is the only page the extension
// reads — so opening it is what turns the Carrefour step green.
const SHOP_URL = 'https://www.carrefour.fr/';

const endpoint = computed((): string => `${config.public.apiBase}/graphql`);

// Step one: the extension's content script announced itself on this page.
const installed = computed((): boolean => extensionHere.value || devices.value.length > 0);

// Step two: a browser is paired to the account.
const paired = computed((): boolean => devices.value.length > 0);

// Step three: the latest report says the shop is signed in.
const latestReport = computed((): (typeof devices.value)[number] | undefined =>
  [...devices.value]
    .filter(
      (device): boolean => device.carrefourSignedIn != null && device.carrefourCheckedAt != null,
    )
    .sort(
      (left, right): number =>
        new Date(right.carrefourCheckedAt as string).getTime() -
        new Date(left.carrefourCheckedAt as string).getTime(),
    )[0],
);
const carrefourSignedIn = computed((): boolean => latestReport.value?.carrefourSignedIn === true);
const carrefourCheckedAt = computed((): string | undefined =>
  latestReport.value?.carrefourCheckedAt == null
    ? undefined
    : new Date(latestReport.value.carrefourCheckedAt as string).toLocaleTimeString(locale.value, {
        hour: '2-digit',
        minute: '2-digit',
      }),
);

const ready = computed((): boolean => installed.value && paired.value && carrefourSignedIn.value);

// Which step the eye should land on: the first one not yet done.
const activeStep = computed((): number => {
  if (!installed.value) return 1;
  if (!paired.value) return 2;
  if (!carrefourSignedIn.value) return 3;
  return 0;
});

const stateOf = (step: number, done: boolean): 'done' | 'active' | 'locked' => {
  if (done) return 'done';
  return activeStep.value === step ? 'active' : 'locked';
};

const pairThis = async (): Promise<void> => {
  await pair(t('order.device.defaultLabel'));
  // The bridge hands the token straight to the extension: no popup, no paste.
  if (freshToken.value !== undefined) sendPairing(endpoint.value, freshToken.value);
};

// Kept fresh while the page is open: the extension reports as the reader sets up
// on other tabs, and each step should tick over without a reload.
const REFRESH_MS = 8000;
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
  <section class="rounded-2xl border border-default p-4 sm:p-5">
    <h2 class="text-lg font-bold">{{ $t('order.setup.title') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('order.setup.intro') }}</p>

    <ol class="mt-4 space-y-3">
      <!-- ① Install -->
      <li
        class="rounded-xl border p-3 transition-colors"
        :class="
          stateOf(1, installed) === 'active'
            ? 'border-primary/40 bg-primary/5'
            : 'border-default'
        "
      >
        <div class="flex items-start gap-3">
          <OrderStepBadge :step="1" :state="stateOf(1, installed)" />
          <div class="min-w-0 flex-1">
            <p class="font-semibold" :class="stateOf(1, installed) === 'locked' && 'text-muted'">
              {{ $t('order.setup.install.title') }}
            </p>
            <p class="text-sm text-muted">{{ $t('order.setup.install.desc') }}</p>

            <div v-if="!installed" class="mt-3 flex flex-col gap-2 sm:flex-row">
              <UButton
                :to="CHROME_STORE_URL"
                target="_blank"
                rel="noopener noreferrer"
                icon="i-lucide-chrome"
                color="primary"
                class="justify-center font-semibold text-white"
              >
                {{ $t('order.install.chrome') }}
                <span class="sr-only">{{ $t('accessibility.newWindow') }}</span>
              </UButton>
              <UButton
                :to="FIREFOX_STORE_URL"
                target="_blank"
                rel="noopener noreferrer"
                icon="i-lucide-globe"
                color="neutral"
                variant="outline"
                class="justify-center font-semibold"
              >
                {{ $t('order.install.firefox') }}
                <span class="sr-only">{{ $t('accessibility.newWindow') }}</span>
              </UButton>
            </div>
            <p v-if="!installed" class="mt-2 text-xs text-muted">{{ $t('order.setup.install.hint') }}</p>
          </div>
        </div>
      </li>

      <!-- ② Pair -->
      <li
        class="rounded-xl border p-3 transition-colors"
        :class="
          stateOf(2, paired) === 'active' ? 'border-primary/40 bg-primary/5' : 'border-default'
        "
      >
        <div class="flex items-start gap-3">
          <OrderStepBadge :step="2" :state="stateOf(2, paired)" />
          <div class="min-w-0 flex-1">
            <p class="font-semibold" :class="stateOf(2, paired) === 'locked' && 'text-muted'">
              {{ $t('order.setup.pair.title') }}
            </p>
            <p class="text-sm text-muted">{{ $t('order.setup.pair.desc') }}</p>

            <UButton
              v-if="stateOf(2, paired) === 'active'"
              icon="i-lucide-plug-zap"
              color="primary"
              class="mt-3 font-semibold text-white"
              :loading="isPairing"
              @click="pairThis"
            >
              {{ $t('order.setup.pair.action') }}
            </UButton>
            <p v-if="justPaired" class="mt-2 text-xs text-success">
              {{ $t('order.device.autoPaired') }}
            </p>

            <!-- Once paired: the browsers, with a way to drop one. -->
            <ul v-if="paired" class="mt-2 space-y-1">
              <li
                v-for="device in devices"
                :key="device.id"
                class="flex items-baseline justify-between gap-3 text-sm"
              >
                <span class="font-medium">{{ device.label }}</span>
                <button type="button" class="text-xs text-muted underline" @click="unpair(device.id)">
                  {{ $t('order.device.unpair') }}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </li>

      <!-- ③ Carrefour -->
      <li
        class="rounded-xl border p-3 transition-colors"
        :class="
          stateOf(3, carrefourSignedIn) === 'active'
            ? 'border-primary/40 bg-primary/5'
            : 'border-default'
        "
      >
        <div class="flex items-start gap-3">
          <OrderStepBadge :step="3" :state="stateOf(3, carrefourSignedIn)" />
          <div class="min-w-0 flex-1">
            <p
              class="font-semibold"
              :class="stateOf(3, carrefourSignedIn) === 'locked' && 'text-muted'"
            >
              {{ $t('order.setup.carrefour.title') }}
            </p>
            <p class="text-sm text-muted">{{ $t('order.setup.carrefour.desc') }}</p>

            <UButton
              v-if="stateOf(3, carrefourSignedIn) === 'active'"
              :to="SHOP_URL"
              target="_blank"
              rel="noopener noreferrer"
              icon="i-lucide-external-link"
              color="primary"
              class="mt-3 font-semibold text-white"
            >
              {{ $t('order.carrefour.open') }}
              <span class="sr-only">{{ $t('accessibility.newWindow') }}</span>
            </UButton>
            <p v-if="carrefourSignedIn && carrefourCheckedAt !== undefined" class="mt-1 text-xs text-muted">
              {{ $t('order.carrefour.checkedAt') }} {{ carrefourCheckedAt }}
            </p>
          </div>
        </div>
      </li>
    </ol>

    <!-- All done: point at the recurring action, and get out of the way. -->
    <div
      v-if="ready"
      class="mt-4 flex items-start gap-2 rounded-xl border border-success/30 bg-success/5 p-3"
    >
      <UIcon name="i-lucide-party-popper" class="mt-0.5 size-5 shrink-0 text-success" />
      <p class="text-sm font-semibold">{{ $t('order.setup.ready') }}</p>
    </div>
  </section>
</template>
