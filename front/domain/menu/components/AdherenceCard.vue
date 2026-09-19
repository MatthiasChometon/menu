<script setup lang="ts">
// The plan this week's meals are tallied against — already flexed for what
// actually happened, so it is passed in rather than derived again here.
const { adherenceMenu } = defineProps<{ adherenceMenu: Menu | undefined }>();

const isMounted = useMounted();
const { rate, eatenCount, totalCount, history } = useAdherence(
  (): Menu | undefined => adherenceMenu,
);
</script>

<template>
  <section
    class="rise mt-6"
    style="animation-delay: 100ms"
    :aria-label="$t('menu.adherence.title')"
  >
    <UCard>
      <h2 class="font-serif text-2xl">{{ $t('menu.adherence.title') }}</h2>
      <p class="mt-1 max-w-sm text-sm text-muted">{{ $t('menu.adherence.hint') }}</p>

      <!-- The tally lives in this device's own storage, unknown to a
           prerendered page: held back until mounted so the reader never
           sees a wrong count flash before the right one. -->
      <template v-if="isMounted">
        <MenuAdherenceRing
          class="mt-5"
          :rate="rate"
          :eaten-count="eatenCount"
          :total-count="totalCount"
        />

        <div class="mt-6 border-t border-default pt-4">
          <p class="mb-3 text-sm font-semibold text-muted">
            {{ $t('menu.adherence.trend') }}
          </p>
          <MenuAdherenceHistory :history="history" />
        </div>
      </template>
      <template v-else>
        <div class="mt-5 flex items-center gap-5" aria-hidden="true">
          <USkeleton class="size-[148px] shrink-0 rounded-full" />
          <div class="min-w-0 flex-1 space-y-2">
            <USkeleton class="h-7 w-24" />
            <USkeleton class="h-4 w-28" />
          </div>
        </div>
        <div class="mt-6 border-t border-default pt-4">
          <p class="mb-3 text-sm font-semibold text-muted">
            {{ $t('menu.adherence.trend') }}
          </p>
          <div class="flex items-end gap-4" aria-hidden="true">
            <USkeleton v-for="n in 4" :key="n" class="h-16 flex-1 rounded-md" />
          </div>
        </div>
        <span class="sr-only">{{ $t('accessibility.loading') }}</span>
      </template>
    </UCard>
  </section>
</template>
