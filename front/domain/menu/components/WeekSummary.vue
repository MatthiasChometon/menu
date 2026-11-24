<script setup lang="ts">
import type { FlexedDay } from '../types/flex.type';
import type { Macros, Menu } from '../types/menu.type';

const { menu, days } = defineProps<{ menu: Menu; days: FlexedDay[] }>();

const { round } = useFoodFormat();

const averageMacros = computed((): Macros | undefined => {
  if (days.length === 0) return undefined;

  const { sumMacros } = useNutrition();
  const total = sumMacros(days.map((day): Macros => day.macros));
  const count = days.length;

  return {
    kcal: total.kcal / count,
    protein: total.protein / count,
    fat: total.fat / count,
    carbs: total.carbs / count,
    fiber: total.fiber / count,
  };
});
</script>

<template>
  <section class="rise mt-6" style="animation-delay: 80ms" :aria-label="$t('menu.weekSummary')">
    <div class="grid gap-4 sm:grid-cols-3">
      <UCard class="sm:col-span-2">
        <p class="mb-4 text-sm font-semibold text-muted">{{ $t('menu.averagePerDay') }}</p>
        <div class="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
          <MenuMacroPlate v-if="averageMacros !== undefined" :macros="averageMacros" />
          <MenuMacroBar
            v-if="averageMacros !== undefined"
            :macros="averageMacros"
            :targets="menu.targets"
          />
        </div>
      </UCard>

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-1">
        <UCard>
          <p class="text-sm text-muted">{{ $t('menu.budget') }}</p>
          <p class="mt-1 text-2xl font-black tabular-nums">{{ round(menu.totalPrice) }} €</p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">{{ $t('menu.recipeCount') }}</p>
          <p class="mt-1 text-2xl font-black tabular-nums">{{ menu.recipes.length }}</p>
        </UCard>
      </div>
    </div>
  </section>
</template>
