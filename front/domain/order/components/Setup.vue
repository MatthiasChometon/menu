<script setup lang="ts">
// The one screen that turns "auto basket" on. Two steps, and only one of them
// asks anything of the reader: install the extension, and sign in to Carrefour.
// Pairing is plumbing — it happens on its own the moment the extension is seen,
// with no button and no token ever shown.
const { extensionHere, extensionConfigured, justPaired, sendPairing, armCarrefourReturn } =
  useExtensionBridge();
const { devices, freshToken, refresh, pair, unpair } = useGroceryDevices();
const config = useRuntimeConfig();
const { t, locale } = useNuxtApp().$i18n;
const route = useRoute();
const router = useRouter();
const toast = useToast();

// Store pages, placeholders until the listings exist. Edge takes the Chrome one.
const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/menu-courses-carrefour';
const FIREFOX_STORE_URL = 'https://addons.mozilla.org/fr/firefox/addon/menu-courses-carrefour/';
// The shop itself, not the IAM sign-in page: it signs the reader in when needed,
// does nothing jarring when they already are, and is the only page the extension
// reads — so opening it is what turns the Carrefour step green.
const SHOP_URL = 'https://www.carrefour.fr/';

const endpoint = computed((): string => `${config.public.apiBase}/graphql`);

// Step one is done when the extension holds a pairing — installed *and* wired to
// the account. That is what actually lets it fill a basket.
const extensionReady = computed((): boolean => extensionConfigured.value);

// Step three's signal, read from the newest report a paired browser sent.
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
// Detecting a Carrefour session by reading its page is best-effort — a
// Cloudflare wall or an icon-only account menu can hide it. So the reader can
// vouch for it too: a confirmation kept on this browser, alongside the report.
const CONFIRM_KEY = 'menu:carrefour-confirmed';
const confirmedHere = ref(false);
const confirmCarrefour = (): void => {
  confirmedHere.value = true;
  try {
    localStorage.setItem(CONFIRM_KEY, '1');
  } catch {
    // A private window with storage blocked: the tick just will not persist.
  }
};
// A real observation from the extension wins over the manual confirmation, up or
// down: the confirmation only fills the gap before the shop has been seen at all.
const carrefourReady = computed((): boolean => {
  const report = latestReport.value;
  if (report !== undefined) {
    return report.carrefourSignedIn === true;
  }

  return confirmedHere.value;
});

// When the extension sees the shop signed out, a stale manual tick must not hold
// it green — drop it, and if the session had been good, say it expired so the
// reader knows to sign in again. There is no background polling: the shop is only
// read while a Carrefour tab is open (its cookies travel nowhere else), and a
// fill opens one, so an expiry surfaces the next time it matters.
watch(
  (): boolean | null | undefined => latestReport.value?.carrefourSignedIn,
  (now, before): void => {
    if (now !== false) {
      return;
    }

    if (confirmedHere.value) {
      confirmedHere.value = false;
      try {
        localStorage.removeItem(CONFIRM_KEY);
      } catch {
        // Storage unavailable: the in-memory flag is already cleared.
      }
    }
    if (before === true) {
      toast.add({
        title: t('order.carrefour.expired'),
        icon: 'i-lucide-triangle-alert',
        color: 'warning',
      });
    }
  },
);
const carrefourCheckedAt = computed((): string | undefined =>
  latestReport.value?.carrefourCheckedAt == null
    ? undefined
    : new Date(latestReport.value.carrefourCheckedAt as string).toLocaleTimeString(locale.value, {
        hour: '2-digit',
        minute: '2-digit',
      }),
);

const ready = computed((): boolean => extensionReady.value && carrefourReady.value);

// Which step the eye should land on: the first one not yet done.
const activeStep = computed((): number => {
  if (!extensionReady.value) return 1;
  if (!carrefourReady.value) return 2;
  return 0;
});

const stateOf = (step: number, done: boolean): 'done' | 'active' | 'locked' => {
  if (done) return 'done';
  return activeStep.value === step ? 'active' : 'locked';
};

// Pair silently: create a device, hand its token to the extension through the
// page. Never shows the token — the extension stores it and reports back.
const pairingSent = ref(false);
const configure = async (): Promise<void> => {
  if (pairingSent.value) return;
  pairingSent.value = true;
  await pair(t('order.device.defaultLabel'));
  if (freshToken.value !== undefined) sendPairing(endpoint.value, freshToken.value);
};
// The moment the extension is seen without a pairing, configure it. If it says
// it is already configured, nothing happens.
watch(
  [extensionHere, extensionConfigured],
  ([here, configured]): void => {
    if (here && !configured) void configure();
  },
  { immediate: true },
);
// A manual way out if the silent handshake was missed, kept quiet.
const retry = (): void => {
  pairingSent.value = false;
  void configure();
};

// Before sending the reader to Carrefour, ask the extension to carry them back
// here once signed in — the Carrefour tab returns to this page with ?connected.
const openCarrefour = (): void => {
  armCarrefourReturn(`${window.location.origin}${window.location.pathname}?connected=1`);
};

// Kept fresh while the page is open: the extension reports as the reader signs in
// on the Carrefour tab, and the step should tick over without a reload.
const REFRESH_MS = 8000;
let timer: ReturnType<typeof setInterval> | undefined;

onMounted((): void => {
  try {
    confirmedHere.value = localStorage.getItem(CONFIRM_KEY) === '1';
  } catch {
    // Storage unavailable: fall back to the extension's report alone.
  }

  void refresh();
  timer = setInterval((): void => {
    void refresh();
  }, REFRESH_MS);

  // Carried back from Carrefour after signing in: confirm it, and drop the flag
  // from the URL so a reload does not repeat the message.
  if (route.query.connected === '1') {
    toast.add({ title: t('order.setup.connected'), icon: 'i-lucide-party-popper', color: 'success' });
    void router.replace({ query: {} });
  }
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
      <!-- ① Install (and pair, silently) -->
      <li
        class="rounded-xl border p-3 transition-colors"
        :class="stateOf(1, extensionReady) === 'active' ? 'border-primary/40 bg-primary/5' : 'border-default'"
      >
        <div class="flex items-start gap-3">
          <OrderStepBadge :step="1" :state="stateOf(1, extensionReady)" />
          <div class="min-w-0 flex-1">
            <p class="font-semibold">{{ $t('order.setup.install.title') }}</p>
            <p class="text-sm text-muted">{{ $t('order.setup.install.desc') }}</p>

            <!-- Not installed yet: the store links. -->
            <div v-if="!extensionHere && !extensionReady" class="mt-3 flex flex-col gap-2 sm:flex-row">
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
            <p v-if="!extensionHere && !extensionReady" class="mt-2 text-xs text-muted">
              {{ $t('order.setup.install.hint') }}
            </p>

            <!-- Installed, configuring itself. No button, no token. -->
            <p
              v-if="extensionHere && !extensionReady"
              class="mt-2 flex items-center gap-2 text-sm text-muted"
            >
              <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
              {{ $t('order.setup.pairing') }}
              <button type="button" class="text-xs underline" @click="retry">
                {{ $t('order.setup.retry') }}
              </button>
            </p>
            <p v-if="justPaired && extensionReady" class="mt-2 text-xs text-success">
              {{ $t('order.device.autoPaired') }}
            </p>

            <!-- Done: the paired browsers, with a way to drop a stray one. -->
            <ul v-if="extensionReady && devices.length > 0" class="mt-2 space-y-1">
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

      <!-- ② Carrefour -->
      <li
        class="rounded-xl border p-3 transition-colors"
        :class="stateOf(2, carrefourReady) === 'active' ? 'border-primary/40 bg-primary/5' : 'border-default'"
      >
        <div class="flex items-start gap-3">
          <OrderStepBadge :step="2" :state="stateOf(2, carrefourReady)" />
          <div class="min-w-0 flex-1">
            <p class="font-semibold" :class="stateOf(2, carrefourReady) === 'locked' && 'text-muted'">
              {{ $t('order.setup.carrefour.title') }}
            </p>
            <p class="text-sm text-muted">{{ $t('order.setup.carrefour.desc') }}</p>

            <UButton
              v-if="stateOf(2, carrefourReady) === 'active'"
              :to="SHOP_URL"
              target="_blank"
              rel="noopener noreferrer"
              icon="i-lucide-external-link"
              color="primary"
              class="mt-3 font-semibold text-white"
              @click="openCarrefour"
            >
              {{ $t('order.carrefour.open') }}
              <span class="sr-only">{{ $t('accessibility.newWindow') }}</span>
            </UButton>
            <p v-if="stateOf(2, carrefourReady) === 'active'" class="mt-2 text-xs text-muted">
              {{ $t('order.carrefour.confirmHint') }}
              <button type="button" class="underline" @click="confirmCarrefour">
                {{ $t('order.carrefour.confirm') }}
              </button>
            </p>
            <p v-if="carrefourReady && carrefourCheckedAt !== undefined" class="mt-1 text-xs text-muted">
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
