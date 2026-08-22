<script setup lang="ts">
const { task, index = 0 } = defineProps<{ task: BatchTask; index?: number }>();

defineEmits<{ done: []; skip: [] }>();

const { imageOf } = useRecipes();
const { nameOf } = useFoodFormat();
const localePath = useLocalePath();

// The list now speaks in totals with the shares underneath. This page has no
// shares to show yet — and, separately, it does not scale to the reader at all,
// so it prints the menu's grammes where the recipe page prints yours. Left as
// it was rather than quietly changed: cooking amounts are not something to
// alter as a side effect of a display refactor.
const quantities = computed((): SharedQuantity[] =>
  task.quantities.map(({ food, grams }): SharedQuantity => ({ food, total: grams, perEater: [] })),
);
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
          <!-- The dot travels with the duration: on a narrow screen it used to
               stay behind on the line above, hanging on its own. -->
          <span class="whitespace-nowrap tabular-nums">
            <span class="text-dimmed">·</span> {{ task.minutes }} {{ $t('batch.minutes') }}
          </span>
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
      <RecipeIngredientList :quantities="quantities" />
    </div>

    <!-- The two ways out of the to-cook list: it is made, or it is not happening
         today. Both have to be one tap away, hands covered in flour. -->
    <div class="mt-4 flex flex-wrap gap-2">
      <UButton
        icon="i-lucide-check"
        color="primary"
        size="sm"
        class="flex-1"
        @click="$emit('done')"
      >
        {{ $t('cooking.markDone') }}
      </UButton>
      <UButton icon="i-lucide-x" color="neutral" variant="subtle" size="sm" @click="$emit('skip')">
        {{ $t('cooking.skip') }}
      </UButton>
    </div>
  </UCard>
</template>
