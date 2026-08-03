<script setup lang="ts">
const { task, index = 0 } = defineProps<{ task: BatchTask; index?: number }>();

const { imageOf } = useRecipes();
const { nameOf } = useFoodFormat();
const localePath = useLocalePath();
</script>

<template>
  <UCard class="rise" :style="{ animationDelay: `${Math.min(index, 6) * 70}ms` }">
    <div class="flex items-start gap-3">
      <div class="size-16 shrink-0 overflow-hidden rounded-xl">
        <UiThumb
          :src="imageOf(task.recipe)"
          :alt="nameOf(task.recipe)"
          icon="i-lucide-cooking-pot"
        />
      </div>

      <div class="min-w-0 flex-1">
        <h3 class="text-pretty font-bold">{{ nameOf(task.recipe) }}</h3>
        <p class="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <span class="font-semibold text-primary tabular-nums">
            {{ task.servings }}
            {{ task.servings === 1 ? $t('batch.servingsOne') : $t('batch.servings') }}
          </span>
          <span class="text-dimmed">·</span>
          <span class="tabular-nums">{{ task.minutes }} {{ $t('batch.minutes') }}</span>
        </p>
      </div>

      <UButton
        :to="localePath(`/recette/${task.recipe.id}`)"
        icon="i-lucide-list-ordered"
        variant="ghost"
        color="neutral"
        size="sm"
        :aria-label="$t('batch.openRecipe')"
      />
    </div>

    <div class="mt-4">
      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-dimmed">
        {{ $t('batch.ingredientsTotal') }}
      </p>
      <RecipeIngredientList :quantities="task.quantities" />
    </div>
  </UCard>
</template>
