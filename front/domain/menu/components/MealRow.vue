<script setup lang="ts">
const { meal, dayKey } = defineProps<{ meal: Meal; dayKey: DayKey }>();

const { imageOf } = useRecipes();
const { nameOf, round } = useFoodFormat();
const { currentMenu } = useMenu();
const localePath = useLocalePath();

const { statusOf, isEaten, toggleEaten } = useCookingLog(currentMenu?.weekOf ?? '');

const isReduced = computed((): boolean => meal.portionRatio < 0.85);

const eaten = computed((): boolean => isEaten(dayKey, meal.slot));

// Ready means the pot exists: the dish was cooked, so this meal is a matter of
// opening the fridge rather than starting a recipe.
const isReady = computed((): boolean => statusOf(meal.recipe.id) === 'done');
</script>

<template>
  <div
    class="group flex items-center gap-1 rounded-2xl transition-colors"
    :class="eaten ? 'opacity-60' : 'hover:bg-elevated/60'"
  >
    <NuxtLink
      :to="localePath(`/recette/${meal.recipe.id}`)"
      class="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-2 focus-visible:bg-elevated/60"
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
        <p class="truncate font-medium" :class="eaten && 'line-through'">
          {{ nameOf(meal.recipe) }}
        </p>
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
          <!-- Only worth saying before the meal is eaten: afterwards the fridge
               no longer holds this portion. -->
          <UBadge v-if="isReady && !eaten" color="primary" variant="subtle" size="sm">
            {{ $t('cooking.inTheFridge') }}
          </UBadge>
        </p>
      </div>
    </NuxtLink>

    <!-- Outside the link on purpose: a button nested in an anchor is invalid,
         and tapping "eaten" must never navigate to the recipe. -->
    <UButton
      :icon="eaten ? 'i-lucide-check-check' : 'i-lucide-check'"
      :color="eaten ? 'primary' : 'neutral'"
      :variant="eaten ? 'soft' : 'ghost'"
      size="sm"
      class="shrink-0"
      :aria-pressed="eaten"
      :aria-label="eaten ? $t('cooking.markNotEaten') : $t('cooking.markEaten')"
      @click="toggleEaten(dayKey, meal.slot)"
    />
  </div>
</template>
