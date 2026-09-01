<script setup lang="ts">
const { macros } = defineProps<{ macros: Macros }>();

const { round } = useFoodFormat();
const { macroKeys } = useNutrition();

const rows = computed((): { key: keyof Macros; value: number; unit: string }[] =>
  macroKeys.map((key): { key: keyof Macros; value: number; unit: string } => ({
    key,
    value: macros[key],
    unit: key === 'kcal' ? 'kcal' : 'g',
  })),
);
</script>

<template>
  <dl class="grid grid-cols-2 gap-2 sm:grid-cols-5">
    <div
      v-for="row in rows"
      :key="row.key"
      class="rounded-2xl border border-default bg-elevated/30 p-3 text-center"
      :class="row.key === 'kcal' && 'col-span-2 sm:col-span-1'"
    >
      <dt class="flex items-center justify-center gap-1.5 text-xs text-muted">
        <span
          v-if="row.key !== 'kcal'"
          class="size-2 shrink-0 rounded-full"
          :style="{ backgroundColor: `var(--macro-${row.key})` }"
          aria-hidden="true"
        />
        {{ $t(`menu.macro.${row.key}`) }}
      </dt>
      <dd class="mt-0.5 text-xl font-black tabular-nums">
        {{ round(row.value)
        }}<span class="ml-0.5 text-xs font-medium text-dimmed">{{ row.unit }}</span>
      </dd>
    </div>
  </dl>
</template>
