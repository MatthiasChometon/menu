<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';

const { t } = useNuxtApp().$i18n;

// Weight and its coaching sit on one tab, the trends and monthly recap on the
// other: two views of the same question — is the plan working — under one
// destination, instead of two separate places in a crowded nav.
const tabs = computed((): TabsItem[] => [
  { label: t('progress.tabs.weight'), icon: 'i-lucide-scale', slot: 'weight' },
  { label: t('progress.tabs.trends'), icon: 'i-lucide-line-chart', slot: 'trends' },
]);

useSeoMeta({ title: (): string => t('progress.pageTitle') });
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6 sm:py-10">
    <h1 class="font-serif text-4xl tracking-tight sm:text-5xl">{{ $t('progress.pageTitle') }}</h1>
    <p class="mt-1 mb-6 text-muted">{{ $t('progress.pageLead') }}</p>

    <UTabs :items="tabs" variant="link" class="w-full gap-5">
      <template #weight>
        <WeightPanel />
      </template>
      <template #trends>
        <InsightsPanel />
      </template>
    </UTabs>
  </div>
</template>
