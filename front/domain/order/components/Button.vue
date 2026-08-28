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
    <div class="flex items-baseline justify-between gap-3">
      <h2 class="font-bold">{{ $t('order.title') }}</h2>
      <NuxtLink :to="localePath('/courses-auto')" class="shrink-0 text-xs text-muted underline">
        {{ $t('order.setupLink') }}
      </NuxtLink>
    </div>

    <!-- No paired browser: one line, then the way to fix it — no run to start. -->
    <template v-if="devicesLoaded && !hasBrowser">
      <p class="mt-2 text-sm text-muted">{{ $t('order.noBrowser') }}</p>
      <NuxtLink
        :to="localePath('/courses-auto')"
        class="mt-3 block w-full rounded-lg bg-primary px-4 py-2 text-center font-semibold text-inverted"
      >
        {{ $t('order.setupCta') }}
      </NuxtLink>
    </template>

    <!-- Paired: the action, and the run's progress once it is under way. -->
    <template v-else>
      <button
        type="button"
        class="mt-3 w-full rounded-lg bg-primary px-4 py-2 font-semibold text-inverted disabled:opacity-60"
        :disabled="isQueueing || isRunning || !devicesLoaded"
        @click="send"
      >
        {{ isQueueing || isRunning ? $t('order.working') : $t('order.action') }}
      </button>
      <p v-if="error" class="mt-2 text-sm text-error" role="alert">{{ $t(error) }}</p>
      <OrderProgress v-if="job" :job="job" class="mt-4" />
    </template>

    <p class="mt-3 text-xs text-muted">{{ $t('order.neverPays') }}</p>
  </section>
</template>
