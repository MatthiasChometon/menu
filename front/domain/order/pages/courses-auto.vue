<script setup lang="ts">
const { t } = useNuxtApp().$i18n;

useHead({ title: t('order.title') });
</script>

<template>
  <main class="mx-auto max-w-2xl space-y-4 p-4">
    <h1 class="text-xl font-bold">{{ $t('order.title') }}</h1>

    <OrderSetup />

    <!-- Not part of getting started: tucked away, opened by whoever wants them. -->
    <details class="rounded-2xl border border-default p-4">
      <summary class="cursor-pointer list-none font-semibold marker:content-none">
        <span class="flex items-center justify-between gap-2">
          {{ $t('order.settings') }}
          <UIcon name="i-lucide-chevron-down" class="size-4 text-dimmed transition-transform" />
        </span>
      </summary>
      <div class="mt-4 space-y-4">
        <OrderSlotWindows />
        <OrderThreshold />
        <OrderPushToggle />
      </div>
    </details>
  </main>
</template>
