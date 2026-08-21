<script setup lang="ts">
import type { MacroGap } from '../composables/usePlanner';

const { gap, tolerance, label } = defineProps<{
  gap: MacroGap;
  tolerance: number;
  label: string;
}>();

const { positionOf, zoneOf } = useGaugePosition();

const cursor = computed((): number => positionOf(gap.gapPercent));

// The target is a window, not a ceiling. Drawing it is what lets somebody see
// they have arrived — and, just as important, that they have gone past.
const zone = computed((): { left: number; width: number } => zoneOf(tolerance));

const isInside = computed((): boolean => Math.abs(gap.gapPercent) <= tolerance);
</script>

<template>
  <div>
    <div class="flex items-baseline justify-between gap-2">
      <span class="text-sm font-medium">{{ label }}</span>
      <span class="text-xs" :class="isInside ? 'text-primary' : 'text-muted'">
        {{
          isInside
            ? $t('planner.gauge.onTarget')
            : $t(`planner.gauge.${gap.gapPercent < 0 ? 'under' : 'over'}`)
        }}
      </span>
    </div>

    <div
      class="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-elevated"
      role="img"
      :aria-label="`${label} — ${isInside ? $t('planner.gauge.onTarget') : $t(`planner.gauge.${gap.gapPercent < 0 ? 'under' : 'over'}`)}`"
    >
      <span
        class="absolute inset-y-0 rounded-full bg-primary/20"
        :style="{ left: `${zone.left}%`, width: `${zone.width}%` }"
      />
      <!-- Slides from where it was to where it is: the movement is what shows
           a dish moved things, which a redrawn bar never does. -->
      <span
        class="absolute inset-y-0 w-1.5 -translate-x-1/2 rounded-full transition-[left] duration-500 ease-out motion-reduce:transition-none"
        :class="isInside ? 'bg-primary' : 'bg-warning'"
        :style="{ left: `${cursor}%` }"
      />
    </div>
  </div>
</template>
