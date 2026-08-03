<script setup lang="ts">
const { quantities } = defineProps<{ quantities: FoodQuantity[] }>();

const { microsOfQuantities, highlightsOf } = useMicros();

const highlights = computed((): MicroHighlight[] => highlightsOf(microsOfQuantities(quantities)));

const format = (highlight: MicroHighlight): string =>
  highlight.amount >= 10 ? String(Math.round(highlight.amount)) : highlight.amount.toFixed(1);
</script>

<template>
  <div>
    <p class="text-sm text-muted">{{ $t('recipe.micro.lead') }}</p>

    <p v-if="highlights.length === 0" class="mt-3 text-sm text-dimmed">
      {{ $t('recipe.micro.none') }}
    </p>

    <ul v-else class="mt-3 space-y-2.5">
      <li
        v-for="highlight in highlights"
        :key="highlight.key"
        class="rounded-2xl border border-default bg-elevated/30 p-3.5"
      >
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-semibold">{{ $t(`recipe.micro.name.${highlight.key}`) }}</span>
          <span class="shrink-0 text-sm tabular-nums text-muted">
            {{ format(highlight) }} {{ highlight.unit }}
          </span>
        </div>

        <div class="mt-2 flex items-center gap-3">
          <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
            <div
              class="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
              :style="{ width: `${Math.min(100, highlight.percentOfTarget)}%` }"
            />
          </div>
          <span class="shrink-0 text-xs font-bold tabular-nums text-primary">
            {{ Math.round(highlight.percentOfTarget) }} %
          </span>
        </div>

        <p class="mt-2 text-sm text-muted">{{ $t(`recipe.micro.why.${highlight.key}`) }}</p>
      </li>
    </ul>
  </div>
</template>
