<script setup lang="ts">
const { featuredMeal, upcomingMeal, isCurrent } = defineProps<{
  featuredMeal: TodayMeal;
  upcomingMeal?: TodayMeal;
  isCurrent: boolean;
}>();

const { imageOf } = useRecipes();
const { nameOf, round } = useFoodFormat();
const localePath = useLocalePath();
</script>

<template>
  <UCard class="rise overflow-hidden" :ui="{ body: 'p-0 sm:p-0' }">
    <div class="p-5 sm:p-6">
      <UBadge :color="isCurrent ? 'primary' : 'neutral'" variant="subtle" size="sm">
        {{ isCurrent ? $t('today.now.current') : $t('today.now.next') }}
      </UBadge>

      <div class="mt-4 flex items-center gap-4">
        <div class="size-20 shrink-0 overflow-hidden rounded-2xl sm:size-24">
          <UiThumb
            :src="imageOf(featuredMeal.meal.recipe)"
            :alt="nameOf(featuredMeal.meal.recipe)"
            icon="i-lucide-cooking-pot"
          />
        </div>

        <div class="min-w-0 flex-1">
          <p class="flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span class="font-medium text-primary">
              {{ $t(`menu.meal.${featuredMeal.meal.slot}`) }}
            </span>
            <span class="text-dimmed">{{ $t(`menu.mealTime.${featuredMeal.meal.slot}`) }}</span>
          </p>
          <NuxtLink
            :to="localePath(`/recette/${featuredMeal.meal.recipe.id}`)"
            class="mt-0.5 block truncate font-serif text-2xl hover:underline sm:text-3xl"
          >
            {{ nameOf(featuredMeal.meal.recipe) }}
          </NuxtLink>
          <p class="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm">
            <span class="font-bold tabular-nums">
              {{ round(featuredMeal.meal.macros.kcal) }} {{ $t('menu.unit.kcal') }}
            </span>
            <span class="tabular-nums text-muted">
              {{ round(featuredMeal.meal.macros.protein) }} {{ $t('menu.unit.gram') }}
              {{ $t('menu.macroShort.protein') }}
            </span>
          </p>
        </div>
      </div>
    </div>

    <NuxtLink
      v-if="upcomingMeal !== undefined"
      :to="localePath(`/recette/${upcomingMeal.meal.recipe.id}`)"
      class="flex items-center gap-3 border-t border-default bg-elevated/40 p-3 transition-colors hover:bg-elevated/70"
    >
      <div class="size-11 shrink-0 overflow-hidden rounded-lg">
        <UiThumb
          :src="imageOf(upcomingMeal.meal.recipe)"
          :alt="nameOf(upcomingMeal.meal.recipe)"
          icon="i-lucide-cooking-pot"
        />
      </div>
      <div class="min-w-0 flex-1">
        <p class="flex flex-wrap items-center gap-x-2 text-xs text-muted">
          <span class="font-medium text-primary">{{ $t('today.now.upcoming') }}</span>
          <span class="text-dimmed">{{ $t(`menu.meal.${upcomingMeal.meal.slot}`) }}</span>
          <span class="text-dimmed">{{ $t(`menu.mealTime.${upcomingMeal.meal.slot}`) }}</span>
        </p>
        <p class="truncate text-sm font-medium">{{ nameOf(upcomingMeal.meal.recipe) }}</p>
      </div>
      <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-dimmed" />
    </NuxtLink>
  </UCard>
</template>
