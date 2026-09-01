<script setup lang="ts">
// The week's commitment mark, drawn the same way as the macro plate: one arc
// instead of three, since there is only one thing being weighed here — meals
// actually eaten against what the week planned.
const { rate, eatenCount, totalCount, size = 148 } = defineProps<{
  rate: number;
  eatenCount: number;
  totalCount: number;
  size?: number;
}>();

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const percent = computed((): number => Math.round(rate * 100));
const arcLength = computed((): number => rate * CIRCUMFERENCE);
</script>

<template>
  <div class="flex items-center gap-5">
    <div class="relative shrink-0" :style="{ width: `${size}px`, height: `${size}px` }">
      <svg
        :viewBox="`0 0 120 120`"
        class="-rotate-90"
        :width="size"
        :height="size"
        aria-hidden="true"
      >
        <circle
          cx="60"
          cy="60"
          :r="RADIUS"
          fill="none"
          stroke="var(--ui-bg-elevated)"
          stroke-width="15"
        />
        <circle
          cx="60"
          cy="60"
          :r="RADIUS"
          fill="none"
          class="adherence-arc"
          stroke="var(--ui-primary)"
          stroke-width="15"
          :style="{
            '--len': `${arcLength}px`,
            '--rest': `${CIRCUMFERENCE - arcLength}px`,
          }"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold leading-none tabular-nums">{{ percent }}%</span>
      </div>
    </div>

    <div class="min-w-0">
      <p class="text-2xl font-semibold tabular-nums">
        {{ eatenCount }}<span class="text-muted"> / {{ totalCount }}</span>
      </p>
      <p class="text-sm text-muted">{{ $t('menu.adherence.meals') }}</p>
    </div>
  </div>
</template>

<style scoped>
.adherence-arc {
  stroke-dasharray: var(--len) var(--rest);
}

@media (prefers-reduced-motion: no-preference) {
  .adherence-arc {
    animation: adherence-draw 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  @keyframes adherence-draw {
    from {
      stroke-dasharray: 0 var(--rest);
    }
    to {
      stroke-dasharray: var(--len) var(--rest);
    }
  }
}
</style>
