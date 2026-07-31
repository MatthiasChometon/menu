<script setup lang="ts">
const { meal } = defineProps<{ meal: Meal }>();

const { imageOf } = useRecipes();
const { nameOf, round } = useFoodFormat();
const localePath = useLocalePath();

const isReduced = computed((): boolean => meal.portionRatio < 0.85);
</script>

<template>
  <NuxtLink
    :to="localePath(`/recette/${meal.recipe.id}`)"
    class="group flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-elevated/60 focus-visible:bg-elevated/60"
  >
    <div class="size-16 shrink-0 overflow-hidden rounded-xl">
      <UiThumb
        :src="imageOf(meal.recipe)"
        :alt="nameOf(meal.recipe)"
        icon="i-lucide-cooking-pot"
        class="transition-transform duration-500 group-hover:scale-105"
      />
    </div>

    <div class="min-w-0 flex-1">
      <p class="flex flex-wrap items-center gap-x-2 text-xs text-muted">
        <span class="font-medium text-primary">{{ $t(`menu.meal.${meal.slot}`) }}</span>
        <span class="text-dimmed">{{ $t(`menu.mealTime.${meal.slot}`) }}</span>
      </p>
      <p class="truncate font-medium">{{ nameOf(meal.recipe) }}</p>
      <p class="flex flex-wrap items-center gap-x-2 text-xs text-muted">
        <span class="tabular-nums">
          {{ round(meal.macros.kcal) }} {{ $t('menu.unit.kcal') }}
        </span>
        <span class="text-dimmed">·</span>
        <span class="tabular-nums">
          {{ round(meal.macros.protein) }} {{ $t('menu.unit.gram') }}
          {{ $t('menu.macroShort.protein') }}
        </span>
        <UBadge v-if="isReduced" color="neutral" variant="subtle" size="sm">
          {{ $t('menu.portionReduced') }}
        </UBadge>
      </p>
    </div>

    <UIcon
      name="i-lucide-chevron-right"
      class="size-5 shrink-0 text-dimmed transition-transform duration-300 group-hover:translate-x-1"
    />
  </NuxtLink>
</template>
