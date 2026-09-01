<script setup lang="ts">
const {
  macros,
  targets,
  compact = false,
} = defineProps<{
  macros: Macros;
  targets: Macros;
  compact?: boolean;
}>();

const { round } = useFoodFormat();

type MacroRow = {
  key: keyof Macros;
  value: number;
  target: number;
  percent: number;
  unit: string;
};

const rows = computed((): MacroRow[] =>
  (['protein', 'carbs', 'fat', 'fiber'] as const).map((key): MacroRow => {
    const target = targets[key];
    return {
      key,
      value: macros[key],
      target,
      percent: target === 0 ? 0 : Math.min(100, (macros[key] / target) * 100),
      unit: 'g',
    };
  }),
);

const kcalPercent = computed((): number =>
  targets.kcal === 0 ? 0 : Math.min(100, (macros.kcal / targets.kcal) * 100),
);

// Each macro keeps its own colour — protein green, carbs wheat, fat copper,
// fibre sage — so a glance down the day reads which nutrient runs short.
const fillOf = (key: keyof Macros): string => `var(--macro-${key})`;
</script>

<template>
  <div :class="compact ? 'space-y-2' : 'space-y-3'">
    <div class="flex items-baseline justify-between gap-2">
      <span class="text-sm font-medium text-muted">{{ $t('menu.macro.kcal') }}</span>
      <span class="font-bold tabular-nums">
        {{ round(macros.kcal) }}
        <span class="text-xs font-normal text-dimmed">/ {{ round(targets.kcal) }}</span>
      </span>
    </div>
    <div class="h-2 overflow-hidden rounded-full bg-elevated">
      <div
        class="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
        :style="{ width: `${kcalPercent}%` }"
      />
    </div>

    <dl class="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
      <div v-for="row in rows" :key="row.key" class="min-w-0">
        <div class="flex items-baseline justify-between gap-1">
          <dt class="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted">
            <span
              class="size-1.5 shrink-0 rounded-full"
              :style="{ backgroundColor: fillOf(row.key) }"
              aria-hidden="true"
            />
            {{ $t(`menu.macroShort.${row.key}`) }}
          </dt>
          <dd class="text-xs font-semibold tabular-nums">
            {{ round(row.value) }}{{ row.unit }}
            <span class="font-normal text-dimmed">/ {{ round(row.target) }}</span>
          </dd>
        </div>
        <div class="mt-1 h-1 overflow-hidden rounded-full bg-elevated">
          <div
            class="h-full rounded-full transition-[width] duration-700 ease-out"
            :style="{ width: `${row.percent}%`, backgroundColor: fillOf(row.key) }"
          />
        </div>
      </div>
    </dl>
  </div>
</template>
