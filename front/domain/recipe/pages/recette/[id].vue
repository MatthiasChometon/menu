<script setup lang="ts">
const route = useRoute();
const localePath = useLocalePath();
const { t } = useNuxtApp().$i18n;
const { currentMenu } = useMenu();
const { recipeOf, imageOf } = useRecipes();
const { variantsOf, portionsOf, weekQuantitiesOf } = useRecipeVariants();
const { seasoningsOf } = useSeasonings();
const { nameOf, stepsOf } = useFoodFormat();
const { macrosOfQuantities } = useNutrition();
const { isPersonalised, scale } = useMyQuantities();

// The whole week is the default: the point of opening a recipe is to cook it,
// and everything it is served in gets cooked in one go.
const WEEK = 'week';

const recipeId = computed((): string => String(route.params.id));

const recipe = computed((): Recipe | undefined => recipeOf(recipeId.value));

const variants = computed((): RecipeVariant[] =>
  currentMenu === undefined ? [] : variantsOf(currentMenu, recipeId.value),
);

const portions = computed((): number => portionsOf(variants.value));

const selectedId = ref(WEEK);

const isWeek = computed((): boolean => selectedId.value === WEEK && portions.value > 1);

// The portion the nutrition figures describe: the selected one, or the largest
// when cooking for the week.
const variant = computed((): RecipeVariant | undefined => {
  const found = variants.value.find((entry): boolean => entry.id === selectedId.value);
  return found ?? variants.value[0];
});

// Cooking for the week covers every serving, not just the ones of the portion
// the figures below describe.
const servings = computed((): RecipeServing[] =>
  isWeek.value
    ? variants.value.flatMap((entry): RecipeServing[] => entry.servings)
    : (variant.value?.servings ?? []),
);

// Weighed out for whoever is reading, falling back to the recipe as written.
const portionQuantities = computed((): FoodQuantity[] =>
  variant.value === undefined ? [] : scale(variant.value.quantities, currentMenu?.targets),
);

const myQuantities = computed((): FoodQuantity[] =>
  isWeek.value
    ? scale(weekQuantitiesOf(variants.value), currentMenu?.targets)
    : portionQuantities.value,
);

// Recomputed rather than read off the menu, so the figures always describe the
// grammes shown just above — the personalised ones included.
const portionMacros = computed((): Macros => macrosOfQuantities(portionQuantities.value));

const seasonings = computed((): Seasoning[] =>
  recipe.value === undefined ? [] : seasoningsOf(recipe.value),
);

const portionLabel = (count: number): string =>
  count > 1 ? t('recipe.portions') : t('recipe.portion');

const portionItems = computed((): SelectItem[] => [
  {
    label: `${t('recipe.wholeWeek')} · ${portions.value} ${portionLabel(portions.value)}`,
    value: WEEK,
  },
  ...variants.value.map((entry): SelectItem => ({
    label:
      variants.value.length > 1
        ? entry.isReduced
          ? t('recipe.portionReduced')
          : t('recipe.portionFull')
        : t('recipe.portionSingle'),
    value: entry.id,
  })),
]);

const heroImage = computed((): string | undefined =>
  recipe.value === undefined ? undefined : imageOf(recipe.value),
);

useSeoMeta({ title: (): string => (recipe.value === undefined ? '' : nameOf(recipe.value)) });
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <UButton
      :to="localePath('/')"
      icon="i-lucide-arrow-left"
      variant="ghost"
      color="neutral"
      class="mb-4"
    >
      {{ $t('recipe.back') }}
    </UButton>

    <div v-if="recipe === undefined" class="flex flex-col items-center gap-3 py-20 text-center">
      <UIcon name="i-lucide-search-x" class="size-12 text-dimmed" />
      <h1 class="text-xl font-bold">{{ $t('recipe.notFound.title') }}</h1>
      <p class="max-w-sm text-muted">{{ $t('recipe.notFound.hint') }}</p>
    </div>

    <article v-else class="space-y-8">
      <header class="rise space-y-4">
        <div
          class="overflow-hidden rounded-3xl"
          :class="heroImage === undefined ? 'h-32 sm:h-40' : 'aspect-[16/10]'"
        >
          <UiThumb
            :src="heroImage"
            :alt="nameOf(recipe)"
            icon="i-lucide-cooking-pot"
            rounded="rounded-3xl"
          />
        </div>

        <div class="space-y-3">
          <h1 class="text-pretty text-3xl font-black tracking-tight">{{ nameOf(recipe) }}</h1>

          <div class="flex flex-wrap items-center gap-2">
            <UBadge color="neutral" variant="subtle" icon="i-lucide-timer">
              {{ recipe.prepMinutes }} {{ $t('recipe.minutes') }}
            </UBadge>
            <UBadge v-if="recipe.batch" color="primary" variant="subtle" icon="i-lucide-boxes">
              {{ $t('recipe.batch') }}
            </UBadge>
            <UBadge
              v-for="serving in servings"
              :key="`${serving.day}-${serving.slot}`"
              color="neutral"
              variant="outline"
            >
              {{ $t(`menu.day.${serving.day}`) }} · {{ $t(`menu.meal.${serving.slot}`) }}
            </UBadge>
          </div>
        </div>
      </header>

      <section v-if="variant !== undefined" class="rise space-y-3" style="animation-delay: 60ms">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-xl font-bold">{{ $t('recipe.ingredients') }}</h2>
          <USelect
            v-if="portions > 1"
            v-model="selectedId"
            :items="portionItems"
            value-key="value"
            :aria-label="$t('recipe.portionChoice')"
            size="sm"
          />
        </div>
        <p class="text-sm text-muted">{{ $t('recipe.raw') }}</p>
        <UAlert
          v-if="isWeek"
          class="mb-3"
          color="primary"
          variant="subtle"
          icon="i-lucide-boxes"
          :title="`${$t('recipe.cookingFor')} ${portions} ${portionLabel(portions)}`"
          :description="$t('recipe.cookingForHint')"
        />
        <UAlert
          v-if="isPersonalised"
          class="mb-3"
          color="primary"
          variant="subtle"
          icon="i-lucide-user-round-check"
          :title="$t('profile.scaled.notice')"
        />
        <RecipeIngredientList :quantities="myQuantities" />
      </section>

      <section v-if="seasonings.length > 0" class="rise space-y-3" style="animation-delay: 80ms">
        <h2 class="text-xl font-bold">{{ $t('recipe.seasonings') }}</h2>
        <p class="text-sm text-muted">{{ $t('recipe.seasoningsHint') }}</p>
        <RecipeSeasoningList :seasonings="seasonings" />
      </section>

      <section v-if="variant !== undefined" class="rise space-y-3" style="animation-delay: 100ms">
        <h2 class="text-xl font-bold">{{ $t('recipe.nutrition') }}</h2>
        <RecipeNutritionFacts :macros="portionMacros" />
      </section>

      <section v-if="variant !== undefined" class="rise space-y-3" style="animation-delay: 120ms">
        <h2 class="text-xl font-bold">{{ $t('recipe.micro.title') }}</h2>
        <RecipeMicroHighlights :quantities="portionQuantities" />
      </section>

      <section class="rise space-y-3" style="animation-delay: 140ms">
        <h2 class="text-xl font-bold">{{ $t('recipe.steps') }}</h2>
        <RecipeStepList :steps="stepsOf(recipe)" :quantities="myQuantities" />
      </section>
    </article>
  </div>
</template>
