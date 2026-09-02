<script setup lang="ts">
const { t } = useNuxtApp().$i18n;

useSeoMeta({ title: (): string => t('weight.pageTitle') });
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6 sm:py-10">
    <h1 class="font-serif text-4xl tracking-tight sm:text-5xl">{{ $t('weight.pageTitle') }}</h1>
    <p class="mt-1 mb-8 text-muted">{{ $t('weight.pageLead') }}</p>
    <WeightPanel />
  </div>
</template>
