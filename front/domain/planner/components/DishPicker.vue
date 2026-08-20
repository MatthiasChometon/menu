<script setup lang="ts">
const { group } = defineProps<{ group: RecipeSlot }>();

const {
  dishesFor,
  isChosen,
  toggleDish,
  chosenDishes,
  pickAtRandom,
  kindOf,
  isQuick,
  limitsOf,
  isGroupComplete,
  isGroupFull,
  recommendedIn,
} = usePlanner();
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

// The order never changes with the selection. Cards that reshuffle the instant
// one is tapped move the next one out from under the finger — two dishes picked
// in a row and the first comes undone. What was chosen is shown in its own row
// above instead, which is the thing that actually needed to be visible.
const dishes = computed((): Recipe[] =>
  dishesFor(group).filter((recipe): boolean => isChosen(group, recipe.id) || matches(recipe)),
);

const chosenRecipes = computed((): Recipe[] =>
  dishesFor(group).filter((recipe): boolean => isChosen(group, recipe.id)),
);

const count = computed((): number => (chosenDishes.value[group] ?? []).length);

// Marked, not reordered. Sorting the grid by merit would move a card out from
// under the finger on every pick; a mark leaves the choice exactly where it was
// and still puts the balanced options first in the eye.
const recommended = computed((): Set<string> => recommendedIn(group));

const preview = ref<Recipe | undefined>(undefined);
const isPreviewOpen = computed({
  get: (): boolean => preview.value !== undefined,
  set: (value: boolean): void => {
    if (!value) preview.value = undefined;
  },
});

const limits = computed((): { min: number; max: number } => limitsOf(group));
const isComplete = computed((): boolean => isGroupComplete(group));
const isFull = computed((): boolean => isGroupFull(group));

// A card that cannot be added should say so before it is tapped.
const isLocked = (recipeId: string): boolean => isFull.value && !isChosen(group, recipeId);
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

    <!-- The requirement stated before the choice, not after a refusal: how many
         are needed, how many are allowed, and how far along you are. -->
    <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
      <div class="flex items-center gap-1.5" :aria-label="$t('planner.chosen')">
        <span
          v-for="slot in limits.max"
          :key="slot"
          class="size-3 rounded-full border-2 transition-colors"
          :class="[
            slot <= count ? 'border-primary bg-primary' : 'border-muted',
            slot <= limits.min && slot > count ? 'border-error' : '',
          ]"
          aria-hidden="true"
        />
      </div>
      <p class="text-sm">
        <span class="font-bold tabular-nums" :class="isComplete ? 'text-primary' : 'text-error'">
          {{ count }}
        </span>
        <span class="text-muted"> / {{ limits.max }} {{ $t('planner.chosen') }}</span>
      </p>
      <p v-if="!isComplete" class="text-sm font-medium text-error">
        {{ $t('planner.needAtLeast') }} {{ limits.min }}
      </p>
      <p v-else-if="isFull" class="text-sm text-muted">{{ $t('planner.maxReached') }}</p>
    </div>

    <p v-if="!isFull" class="mt-2 flex items-center gap-1.5 text-xs text-muted">
      <UIcon name="i-lucide-sparkles" class="size-3.5 shrink-0 text-primary" />
      {{ $t('planner.balance.hint') }}
    </p>

    <!-- What is already chosen, at a glance and removable, without hunting for
         it among the cards. -->
    <div v-if="chosenRecipes.length > 0" class="mt-3 flex flex-wrap gap-2">
      <UButton
        v-for="dish in chosenRecipes"
        :key="dish.id"
        trailing-icon="i-lucide-x"
        color="primary"
        variant="soft"
        size="xs"
        @click="toggleDish(group, dish.id)"
      >
        {{ nameOf(dish) }}
      </UButton>
    </div>

    <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div
        v-for="dish in dishes"
        :key="dish.id"
        class="group relative overflow-hidden rounded-2xl border-2 transition-all"
        :class="[
          isChosen(group, dish.id)
            ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
            : 'border-default hover:border-primary/40',
          isLocked(dish.id) && 'opacity-40',
        ]"
      >
        <button
          type="button"
          role="checkbox"
          :aria-checked="isChosen(group, dish.id)"
          class="block w-full text-left"
          :class="isLocked(dish.id) ? 'cursor-not-allowed' : 'cursor-pointer'"
          :disabled="isLocked(dish.id)"
          @click="toggleDish(group, dish.id)"
        >
          <div class="relative aspect-[4/3] overflow-hidden">
            <UiThumb
              :src="imageOf(dish)"
              :alt="nameOf(dish)"
              icon="i-lucide-cooking-pot"
              class="transform-gpu transition-transform duration-500 will-change-transform group-hover:scale-105"
            />
            <!-- A tinted veil over the whole photograph rather than a badge in a
                 corner: a green tick on a green dish disappears, but a card that
                 has visibly changed state cannot be missed. -->
            <span
              v-if="isChosen(group, dish.id)"
              class="absolute inset-0 bg-primary/35"
              aria-hidden="true"
            />
          </div>

          <!-- Opposite corner to the tick, and gone the moment the dish is
               chosen: it is advice on what to take next, not a label. -->
          <span
            v-if="recommended.has(dish.id) && !isLocked(dish.id)"
            class="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[0.65rem] font-bold text-primary shadow-md ring-1 ring-primary/30"
          >
            <UIcon name="i-lucide-sparkles" class="size-3" />
            {{ $t('planner.balance.mark') }}
          </span>

          <!-- White disc, coloured tick: its legibility owes nothing to whatever
               is underneath it. -->
          <span
            v-if="isChosen(group, dish.id)"
            class="absolute left-2 top-2 flex size-8 items-center justify-center rounded-full bg-white text-primary shadow-lg ring-2 ring-primary"
            aria-hidden="true"
          >
            <UIcon name="i-lucide-check" class="size-5" />
          </span>

          <div class="p-2.5 pr-10">
            <p
              class="text-pretty text-sm leading-tight"
              :class="isChosen(group, dish.id) ? 'font-bold text-primary' : 'font-semibold'"
            >
              {{ nameOf(dish) }}
            </p>
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
