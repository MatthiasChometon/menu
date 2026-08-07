<script setup lang="ts">
const { group } = defineProps<{ group: RecipeSlot }>();

const { dishesFor, isChosen, toggleDish, chosenDishes, pickAtRandom } = usePlanner();
const { nameOf } = useFoodFormat();
const { imageOf } = useRecipes();

// Chosen dishes rise to the top: with twenty-odd cards, what you already picked
// should never be something you have to scroll back to find.
const dishes = computed((): Recipe[] =>
  [...dishesFor(group)].sort(
    (left, right): number => Number(isChosen(group, right.id)) - Number(isChosen(group, left.id)),
  ),
);

const count = computed((): number => (chosenDishes.value[group] ?? []).length);

// Three is the working rule of the week: enough variety not to tire of a dish,
// few enough to cook them all in one Sunday.
const suggested = 3;
</script>

<template>
  <section>
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-0 flex-1">
        <h2 class="text-2xl font-black tracking-tight">{{ $t(`planner.group.${group}`) }}</h2>
        <p class="mt-1 text-sm text-muted">{{ $t(`planner.groupHint.${group}`) }}</p>
      </div>
      <UButton
        icon="i-lucide-shuffle"
        variant="outline"
        color="neutral"
        size="sm"
        class="shrink-0"
        @click="pickAtRandom(group)"
      >
        {{ $t('planner.random') }}
      </UButton>
    </div>

    <p class="mt-3 text-sm">
      <span class="font-bold tabular-nums" :class="count === 0 ? 'text-dimmed' : 'text-primary'">
        {{ count }}
      </span>
      <span class="text-muted"> / {{ suggested }} {{ $t('planner.chosen') }}</span>
    </p>

    <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <button
        v-for="dish in dishes"
        :key="dish.id"
        type="button"
        role="checkbox"
        :aria-checked="isChosen(group, dish.id)"
        class="group relative cursor-pointer overflow-hidden rounded-2xl border text-left transition-all"
        :class="
          isChosen(group, dish.id)
            ? 'border-primary ring-2 ring-primary/30'
            : 'border-default hover:border-primary/40'
        "
        @click="toggleDish(group, dish.id)"
      >
        <div class="aspect-[4/3] overflow-hidden">
          <UiThumb
            :src="imageOf(dish)"
            :alt="nameOf(dish)"
            icon="i-lucide-cooking-pot"
            class="transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        <!-- The tick sits on the photograph: at this size a separate column of
             checkboxes would cost more room than the answer is worth. -->
        <span
          v-if="isChosen(group, dish.id)"
          class="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary text-white shadow"
          aria-hidden="true"
        >
          <UIcon name="i-lucide-check" class="size-4" />
        </span>

        <div class="p-2.5">
          <p class="text-pretty text-sm font-semibold leading-tight">{{ nameOf(dish) }}</p>
          <p class="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span class="tabular-nums">{{ dish.prepMinutes }} {{ $t('recipe.minutes') }}</span>
            <span v-if="dish.batch" class="text-primary">{{ $t('planner.batchShort') }}</span>
          </p>
        </div>
      </button>
    </div>
  </section>
</template>
