<script setup lang="ts">
const { group, index = 0 } = defineProps<{ group: RecipeSlot; index?: number }>();

const { dishesFor, isChosen, toggleDish, chosenDishes } = usePlanner();
const { nameOf } = useFoodFormat();
const { imageOf } = useRecipes();

const dishes = computed((): Recipe[] => dishesFor(group));

const count = computed((): number => (chosenDishes.value[group] ?? []).length);

// Three is the working rule of the week: enough variety not to tire of a dish,
// few enough to cook them all in one Sunday.
const suggested = 3;
</script>

<template>
  <section class="rise" :style="{ animationDelay: `${Math.min(index, 4) * 60}ms` }">
    <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 class="text-lg font-bold">{{ $t(`planner.group.${group}`) }}</h2>
      <p class="text-sm text-muted">{{ $t(`planner.groupHint.${group}`) }}</p>
      <span
        class="ml-auto shrink-0 text-sm font-semibold tabular-nums"
        :class="count === 0 ? 'text-dimmed' : 'text-primary'"
      >
        {{ count }} / {{ suggested }}
      </span>
    </div>

    <div class="mt-3 grid gap-2 sm:grid-cols-2">
      <button
        v-for="dish in dishes"
        :key="dish.id"
        type="button"
        role="checkbox"
        :aria-checked="isChosen(group, dish.id)"
        class="flex cursor-pointer items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors"
        :class="
          isChosen(group, dish.id)
            ? 'border-primary/50 bg-primary/5'
            : 'border-default hover:border-primary/40 hover:bg-elevated/50'
        "
        @click="toggleDish(group, dish.id)"
      >
        <div class="size-11 shrink-0 overflow-hidden rounded-lg">
          <UiThumb :src="imageOf(dish)" :alt="nameOf(dish)" icon="i-lucide-cooking-pot" />
        </div>
        <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ nameOf(dish) }}</span>
        <span
          class="flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors"
          :class="
            isChosen(group, dish.id) ? 'border-primary bg-primary text-white' : 'border-muted'
          "
          aria-hidden="true"
        >
          <UIcon v-if="isChosen(group, dish.id)" name="i-lucide-check" class="size-3.5" />
        </span>
      </button>
    </div>
  </section>
</template>
