<script setup lang="ts">
const { t } = useNuxtApp().$i18n;
const { selectedMenu } = useSelectedWeek();

useSeoMeta({ title: (): string => t('insights.pageTitle') });
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6 sm:py-10">
    <h1 class="font-serif text-4xl tracking-tight sm:text-5xl">{{ $t('insights.pageTitle') }}</h1>
    <p class="mt-1 mb-8 text-muted">{{ $t('insights.pageLead') }}</p>

    <!-- Every section reads localStorage (the weigh-in and adherence
         diaries), which only exists in the browser. Rendering it on the
         server would prerender an empty page and swap it at hydration, so
         the skeleton is what both sides render first. -->
    <ClientOnly>
      <template #fallback>
        <div class="grid gap-4">
          <USkeleton class="h-56 rounded-2xl" />
          <USkeleton class="h-40 rounded-2xl" />
          <USkeleton class="h-40 rounded-2xl" />
          <USkeleton class="h-96 rounded-2xl" />
          <span class="sr-only">{{ $t('accessibility.loading') }}</span>
        </div>
      </template>

      <div class="grid gap-5">
        <InsightsProgressionTable />
        <InsightsBudgetEfficiency :menu="selectedMenu" />
        <InsightsMicroGap :menu="selectedMenu" />
        <InsightsMonthlyRecapCard />
      </div>
    </ClientOnly>
  </div>
</template>
