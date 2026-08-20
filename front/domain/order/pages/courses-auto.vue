<script setup lang="ts">
const { t } = useNuxtApp().$i18n;

useHead({ title: t('order.title') });
</script>

<template>
  <main class="mx-auto max-w-2xl space-y-4 p-4">
    <h1 class="text-xl font-bold">{{ $t('order.title') }}</h1>
    <OrderCarrefourAccount />
    <OrderSlotWindows />
    <OrderThreshold />
    <OrderDeviceList />
  </main>
</template>
