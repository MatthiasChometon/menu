<script setup lang="ts">
// The brand mark made functional: a plate split into three wedges by where the
// day's energy comes from — protein, carbs, fat — with the total kcal weighed
// out in the middle. Fibre carries almost no energy, so it stays off the plate.
const { macros, size = 148 } = defineProps<{
  macros: Macros;
  size?: number;
}>();

const { round } = useFoodFormat();

type EnergyKey = 'protein' | 'carbs' | 'fat';
const keys: readonly EnergyKey[] = ['protein', 'carbs', 'fat'];

const energy = computed((): Record<EnergyKey, number> & { total: number } => {
  const protein = macros.protein * 4;
  const carbs = macros.carbs * 4;
  const fat = macros.fat * 9;
  const total = protein + carbs + fat;
  return { protein, carbs, fat, total: total === 0 ? 1 : total };
});

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Wedge = { key: EnergyKey; length: number; offset: number; delayMs: number };

const wedges = computed((): Wedge[] => {
  let start = 0;
  return keys.map((key, index): Wedge => {
    const length = (energy.value[key] / energy.value.total) * CIRCUMFERENCE;
    const wedge: Wedge = { key, length, offset: start, delayMs: index * 140 };
    start += length;
    return wedge;
  });
});

const shareOf = (key: EnergyKey): number =>
  Math.round((energy.value[key] / energy.value.total) * 100);
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
        <circle cx="60" cy="60" :r="RADIUS" fill="none" class="stroke-elevated" stroke-width="15" />
        <circle
          v-for="wedge in wedges"
          :key="wedge.key"
          class="plate-wedge"
          cx="60"
          cy="60"
          :r="RADIUS"
          fill="none"
          stroke-width="15"
          :stroke="`var(--macro-${wedge.key})`"
          :stroke-dashoffset="-wedge.offset"
          :style="{
            '--len': `${wedge.length}px`,
            '--rest': `${CIRCUMFERENCE - wedge.length}px`,
            animationDelay: `${wedge.delayMs}ms`,
          }"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold leading-none tabular-nums">{{ round(macros.kcal) }}</span>
        <span class="mt-0.5 text-[0.65rem] uppercase tracking-wider text-dimmed">
          {{ $t('menu.unit.kcal') }}
        </span>
      </div>
    </div>

    <dl class="min-w-0 space-y-1.5">
      <div v-for="key in keys" :key="key" class="flex items-center gap-2">
        <span
          class="size-2.5 shrink-0 rounded-full"
          :style="{ backgroundColor: `var(--macro-${key})` }"
          aria-hidden="true"
        />
        <dt class="text-sm text-muted">{{ $t(`menu.macroShort.${key}`) }}</dt>
        <dd class="ml-auto text-sm font-semibold tabular-nums">{{ shareOf(key) }}%</dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.plate-wedge {
  stroke-dasharray: var(--len) var(--rest);
}

@media (prefers-reduced-motion: no-preference) {
  .plate-wedge {
    animation: plate-draw 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  @keyframes plate-draw {
    from {
      stroke-dasharray: 0 var(--rest);
    }
    to {
      stroke-dasharray: var(--len) var(--rest);
    }
  }
}
</style>
