<script setup lang="ts">
const { menu } = defineProps<{ menu: Menu }>();

const { needsOf } = useBasketNeeds();
const { job, isQueueing, isRunning, error, order } = useGroceryOrder();
const { devices, refresh: refreshDevices } = useGroceryDevices();
const localePath = useLocalePath();

// Whether a browser has ever been paired. Without one, a queued run waits for a
// machine that never comes — the reason a fill can sit at "En cours…" with
// nothing explaining it. Loaded here so the card can say so up front rather
// than leave the reader watching a spinner that will never move.
const devicesLoaded = ref(false);
onMounted(async (): Promise<void> => {
  await refreshDevices();
  devicesLoaded.value = true;
});
const hasBrowser = computed((): boolean => devices.value.length > 0);

const send = async (): Promise<void> => {
  await order(menu.weekOf, needsOf(menu));
};
</script>

<template>
  <section class="rounded-xl border border-default p-4">
    <h2 class="font-bold">{{ $t('order.title') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('order.lead') }}</p>

    <!-- What a "paired browser" is and where to set one up, said before the
         button: the fill only ever starts on a machine paired beforehand, and
         nowhere else on this card explains that. -->
    <p class="mt-2 text-xs text-muted">{{ $t('order.howItWorks') }}</p>
    <NuxtLink
      :to="localePath('/courses-auto')"
      class="mt-1 inline-block text-xs font-semibold text-primary underline"
    >
      {{ $t('order.setupLink') }}
    </NuxtLink>

    <!-- No browser paired: a queued run would wait forever, so the reason is
         spelled out here rather than left to a spinner. -->
    <p
      v-if="devicesLoaded && !hasBrowser"
      class="mt-3 rounded-lg border border-default bg-elevated/40 p-3 text-sm text-muted"
    >
      {{ $t('order.noBrowser') }}
    </p>

    <!-- No paired browser: send them to set one up rather than start a run that
         can only wait forever. The fill button appears once one exists. -->
    <NuxtLink
      v-if="devicesLoaded && !hasBrowser"
      :to="localePath('/courses-auto')"
      class="mt-3 block w-full rounded-lg bg-primary px-4 py-2 text-center font-semibold text-inverted"
    >
      {{ $t('order.setupCta') }}
    </NuxtLink>
    <button
      v-else
      type="button"
      class="mt-3 w-full rounded-lg bg-primary px-4 py-2 font-semibold text-inverted disabled:opacity-60"
      :disabled="isQueueing || isRunning || !devicesLoaded"
      @click="send"
    >
      {{ isQueueing || isRunning ? $t('order.working') : $t('order.action') }}
    </button>

    <p v-if="error" class="mt-2 text-sm text-error" role="alert">{{ $t(error) }}</p>

    <OrderProgress v-if="job" :job="job" class="mt-4" />

    <p class="mt-3 text-xs text-muted">{{ $t('order.neverPays') }}</p>
  </section>
</template>
