<script setup lang="ts">
import type { WeekAdherence } from '../composables/useAdherence';

// The four weeks behind the ring, so a losing streak or a good run shows at a
// glance instead of hiding inside a single percentage.
const { history } = defineProps<{ history: WeekAdherence[] }>();

const { locale } = useNuxtApp().$i18n;

const MAX_HEIGHT = 64;

const heightOf = (week: WeekAdherence): number => Math.max(4, Math.round(week.rate * MAX_HEIGHT));

const dateLabelOf = (weekOf: string): string =>
  new Date(`${weekOf}T00:00:00`).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'short',
  });
</script>

<template>
  <ul class="flex items-end gap-4">
    <li
      v-for="(week, index) in history"
      :key="week.weekOf"
      class="flex flex-1 flex-col items-center gap-1.5"
    >
      <span class="text-xs font-semibold tabular-nums">{{ Math.round(week.rate * 100) }}%</span>
      <div class="flex h-16 w-full items-end justify-center rounded-md bg-elevated">
        <div
          class="w-full rounded-md bg-primary transition-[height] duration-700 ease-out"
          :style="{ height: `${heightOf(week)}px` }"
        />
      </div>
      <span class="text-xs text-dimmed tabular-nums">
        {{ index === history.length - 1 ? $t('menu.week.current') : dateLabelOf(week.weekOf) }}
      </span>
    </li>
  </ul>
</template>
