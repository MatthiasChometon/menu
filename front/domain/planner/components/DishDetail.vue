<script setup lang="ts">
const { recipe, group } = defineProps<{ recipe: Recipe; group: RecipeSlot }>();

const open = defineModel<boolean>({ required: true });

const { isChosen, toggleDish } = usePlanner();
const { nameOf, stepsOf, quantityLabel } = useFoodFormat();
const { imageOf } = useRecipes();
const { seasoningsOf } = useSeasonings();
const { foodOf } = useFoods();
const { macrosOfQuantities } = useNutrition();
const { plainTextOf } = useRecipeSteps();

// The reference portion, as written. It is what the solver will scale, so it is
// the honest thing to show while deciding whether the dish appeals.
const quantities = computed((): FoodQuantity[] =>
  Object.entries(recipe.ingredients)
    .map(([id, grams]): FoodQuantity | undefined => {
      const food = foodOf(id);
      return food === undefined ? undefined : { food, grams };
    })
    .filter((quantity): quantity is FoodQuantity => quantity !== undefined),
);

const macros = computed((): Macros => macrosOfQuantities(quantities.value));

const chosen = computed((): boolean => isChosen(group, recipe.id));

const choose = (): void => {
  toggleDish(group, recipe.id);
  open.value = false;
};
</script>

<template>
  <UModal v-model:open="open" :title="nameOf(recipe)">
    <template #body>
      <div class="space-y-5">
        <div class="aspect-[16/10] overflow-hidden rounded-2xl">
          <UiThumb :src="imageOf(recipe)" :alt="nameOf(recipe)" icon="i-lucide-cooking-pot" />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UBadge color="neutral" variant="subtle" icon="i-lucide-timer">
            {{ recipe.prepMinutes }} {{ $t('recipe.minutes') }}
          </UBadge>
          <UBadge v-if="recipe.batch" color="primary" variant="subtle" icon="i-lucide-boxes">
            {{ $t('recipe.batch') }}
          </UBadge>
        </div>

        <section>
          <h3 class="mb-2 font-bold">{{ $t('recipe.nutrition') }}</h3>
          <RecipeNutritionFacts :macros="macros" />
        </section>

        <section>
          <h3 class="mb-1 font-bold">{{ $t('recipe.ingredients') }}</h3>
          <p class="mb-2 text-sm text-muted">{{ $t('planner.detail.reference') }}</p>
          <ul class="grid gap-1.5 sm:grid-cols-2">
            <li
              v-for="quantity in quantities"
              :key="quantity.food.id"
              class="flex items-center justify-between gap-3 rounded-xl bg-elevated/50 px-3 py-2 text-sm"
            >
              <span class="min-w-0 truncate">{{ nameOf(quantity.food) }}</span>
              <span class="shrink-0 font-semibold tabular-nums">
                {{ quantityLabel(quantity.food, quantity.grams) }}
              </span>
            </li>
          </ul>
        </section>

        <section v-if="seasoningsOf(recipe).length > 0">
          <h3 class="mb-2 font-bold">{{ $t('recipe.seasonings') }}</h3>
          <RecipeSeasoningList :seasonings="seasoningsOf(recipe)" />
        </section>

        <section>
          <h3 class="mb-2 font-bold">{{ $t('recipe.steps') }}</h3>
          <ol class="space-y-2">
            <li
              v-for="(step, index) in stepsOf(recipe)"
              :key="step"
              class="flex items-start gap-3 text-sm"
            >
              <span
                class="flex size-6 shrink-0 items-center justify-center rounded-full bg-elevated text-xs font-bold text-muted"
                aria-hidden="true"
              >
                {{ index + 1 }}
              </span>
              <!-- Plain text here: the markup that carries the weights belongs to
                   the recipe page, where the portion is actually chosen. -->
              <span class="text-pretty leading-relaxed">{{ plainTextOf(step) }}</span>
            </li>
          </ol>
        </section>
      </div>
    </template>

    <template #footer>
      <UButton
        :icon="chosen ? 'i-lucide-x' : 'i-lucide-check'"
        :color="chosen ? 'neutral' : 'primary'"
        :variant="chosen ? 'subtle' : 'solid'"
        size="lg"
        block
        :class="!chosen && 'font-semibold text-white'"
        @click="choose"
      >
        {{ chosen ? $t('planner.detail.remove') : $t('planner.detail.choose') }}
      </UButton>
    </template>
  </UModal>
</template>
