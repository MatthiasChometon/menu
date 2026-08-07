<script setup lang="ts">
const { group } = defineProps<{ group: RecipeSlot }>();

const { dishesFor, isChosen, toggleDish, chosenDishes, pickAtRandom, kindOf, isQuick } =
  usePlanner();
const { nameOf } = useFoodFormat();
const { imageOf } = useRecipes();

type Filter = 'all' | DishKind | 'quick';

// Only the savoury dishes are numerous enough to need narrowing, and only they
// come in fish, meat and vegetable. Offering the same chips on a list of skyr
// bowls would be noise.
const FILTERS: Filter[] = ['all', 'fish', 'meat', 'veggie', 'quick'];

const filter = ref<Filter>('all');

watch(
  (): RecipeSlot => group,
  (): void => {
    filter.value = 'all';
  },
);

const hasFilters = computed((): boolean => group === 'main');

const matches = (recipe: Recipe): boolean => {
  if (filter.value === 'all') return true;
  if (filter.value === 'quick') return isQuick(recipe);
  return kindOf(recipe) === filter.value;
};

// Chosen dishes rise to the top: with twenty-odd cards, what you already picked
// should never be something you have to scroll back to find. They survive the
// filter too, so narrowing the list never hides a choice already made.
const dishes = computed((): Recipe[] =>
  dishesFor(group)
    .filter((recipe): boolean => isChosen(group, recipe.id) || matches(recipe))
    .sort(
      (left, right): number => Number(isChosen(group, right.id)) - Number(isChosen(group, left.id)),
    ),
);

const count = computed((): number => (chosenDishes.value[group] ?? []).length);

const preview = ref<Recipe | undefined>(undefined);
const isPreviewOpen = computed({
  get: (): boolean => preview.value !== undefined,
  set: (value: boolean): void => {
    if (!value) preview.value = undefined;
  },
});

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

    <div v-if="hasFilters" class="mt-4 flex flex-wrap gap-2">
      <UButton
        v-for="entry in FILTERS"
        :key="entry"
        size="xs"
        :variant="filter === entry ? 'solid' : 'outline'"
        :color="filter === entry ? 'primary' : 'neutral'"
        :class="filter === entry && 'text-white'"
        @click="filter = entry"
      >
        {{ $t(`planner.filter.${entry}`) }}
      </UButton>
    </div>

    <p class="mt-3 text-sm">
      <span class="font-bold tabular-nums" :class="count === 0 ? 'text-dimmed' : 'text-primary'">
        {{ count }}
      </span>
      <span class="text-muted"> / {{ suggested }} {{ $t('planner.chosen') }}</span>
    </p>

    <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div
        v-for="dish in dishes"
        :key="dish.id"
        class="group relative overflow-hidden rounded-2xl border transition-all"
        :class="
          isChosen(group, dish.id)
            ? 'border-primary ring-2 ring-primary/30'
            : 'border-default hover:border-primary/40'
        "
      >
        <button
          type="button"
          role="checkbox"
          :aria-checked="isChosen(group, dish.id)"
          class="block w-full cursor-pointer text-left"
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

          <span
            v-if="isChosen(group, dish.id)"
            class="absolute left-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary text-white shadow"
            aria-hidden="true"
          >
            <UIcon name="i-lucide-check" class="size-4" />
          </span>

          <div class="p-2.5 pr-10">
            <p class="text-pretty text-sm font-semibold leading-tight">{{ nameOf(dish) }}</p>
            <p class="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span class="tabular-nums">{{ dish.prepMinutes }} {{ $t('recipe.minutes') }}</span>
              <span v-if="dish.batch" class="text-primary">{{ $t('planner.batchShort') }}</span>
            </p>
          </div>
        </button>

        <!-- Its own control, outside the selecting button: a name and a thumbnail
             are not enough to know whether a dish appeals. -->
        <UButton
          icon="i-lucide-eye"
          variant="ghost"
          color="neutral"
          size="sm"
          class="absolute bottom-1.5 right-1.5"
          :aria-label="`${$t('planner.detail.see')} ${nameOf(dish)}`"
          @click="preview = dish"
        />
      </div>
    </div>

    <p v-if="dishes.length === 0" class="mt-6 text-center text-sm text-muted">
      {{ $t('planner.filter.none') }}
    </p>

    <PlannerDishDetail
      v-if="preview !== undefined"
      v-model="isPreviewOpen"
      :recipe="preview"
      :group="group"
    />
  </section>
</template>
