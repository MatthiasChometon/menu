<script setup lang="ts">
const route = useRoute();
const localePath = useLocalePath();
const { t } = useNuxtApp().$i18n;
const { currentMenu } = useMenu();
const { recipeOf, imageOf } = useRecipes();
const { variantsOf } = useRecipeVariants();
const { nameOf, stepsOf } = useFoodFormat();

const recipeId = computed((): string => String(route.params.id));

const recipe = computed((): Recipe | undefined => recipeOf(recipeId.value));

const variants = computed((): RecipeVariant[] =>
  currentMenu === undefined ? [] : variantsOf(currentMenu, recipeId.value),
);

const selectedVariantId = ref(variants.value[0]?.id ?? '');

const variant = computed((): RecipeVariant | undefined => {
  const found = variants.value.find((entry): boolean => entry.id === selectedVariantId.value);
  return found ?? variants.value[0];
});

const variantItems = computed((): SelectItem[] =>
  variants.value.map((entry): SelectItem => ({
    label: entry.isReduced ? t('recipe.portionReduced') : t('recipe.portionFull'),
    value: entry.id,
  })),
);

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
              v-for="serving in variant?.servings ?? []"
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
            v-if="variantItems.length > 1"
            v-model="selectedVariantId"
            :items="variantItems"
            value-key="value"
            :aria-label="$t('recipe.portionFull')"
            size="sm"
          />
        </div>
        <p class="text-sm text-muted">{{ $t('recipe.raw') }}</p>
        <RecipeIngredientList :quantities="variant.quantities" />
      </section>

      <section v-if="variant !== undefined" class="rise space-y-3" style="animation-delay: 100ms">
        <h2 class="text-xl font-bold">{{ $t('recipe.nutrition') }}</h2>
        <RecipeNutritionFacts :macros="variant.macros" />
      </section>

      <section class="rise space-y-3" style="animation-delay: 140ms">
        <h2 class="text-xl font-bold">{{ $t('recipe.steps') }}</h2>
        <RecipeStepList :steps="stepsOf(recipe)" />
      </section>
    </article>
  </div>
</template>
