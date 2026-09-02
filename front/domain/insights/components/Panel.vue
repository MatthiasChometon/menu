<script setup lang="ts">
const { selectedMenu } = useSelectedWeek();
</script>

<template>
  <!-- Every section reads localStorage (the weigh-in and adherence diaries),
       which only exists in the browser: rendering on the server would prerender
       an empty page and swap it at hydration, so the skeleton renders first. -->
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
</template>
