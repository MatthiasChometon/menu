<script setup lang="ts">
import { customRecipeFormConstraints } from '../../customCatalog/utils/constraints';
import { CUSTOM_RECIPE_SLOTS, toAppSlot, toGraphqlSlot } from '../../customCatalog/utils/toCatalog';
import type { CustomRecipe, CustomRecipeDraft } from '../../customCatalog/types/customCatalog.type';
import type { FoodQuantity, Macros, RecipeSlot } from '../../menu/types/menu.type';

// Creates or edits one of the reader's own recipes. Editing is told apart from
// creating by whether a recipe was handed in at all, so the same dialog and
// the same validation serve both — a second form would only ever drift from
// this one.
const { recipe } = defineProps<{ recipe?: CustomRecipe }>();
const open = defineModel<boolean>({ required: true });

const { create, update } = useMyRecipes();
const { foods, foodOf } = useFoods();
const { macrosOfQuantities } = useNutrition();
const { nameOf } = useFoodFormat();
const { t } = useNuxtApp().$i18n;
const {
  maxNameLength,
  maxIngredients,
  maxSteps,
  maxStepLength,
  maxGramsPerIngredient,
  maxPrepMinutes,
} = customRecipeFormConstraints();

type IngredientRow = { foodId: string | undefined; grams: number };

const isEditing = computed((): boolean => recipe !== undefined);

const rowsOf = (source: CustomRecipe | undefined): IngredientRow[] =>
  source === undefined
    ? [{ foodId: undefined, grams: 100 }]
    : source.ingredients.map(({ foodId, grams }): IngredientRow => ({ foodId, grams }));

const name = ref(recipe?.name ?? '');
const slot = ref<RecipeSlot>(recipe === undefined ? 'main' : toAppSlot(recipe.slot));
const rows = ref<IngredientRow[]>(rowsOf(recipe));
const steps = ref<string[]>(recipe === undefined ? [''] : [...recipe.steps]);
const prepMinutes = ref(recipe?.prepMinutes ?? 20);
const batch = ref(recipe?.batch ?? false);
const isSaving = ref(false);
const saveFailed = ref(false);

// Reset to a blank sheet (or the recipe being edited) each time the dialog
// opens: closing it on a half-filled form should not leave that draft behind
// for the next recipe it is asked to create.
watch(open, (isOpen): void => {
  if (!isOpen) return;
  name.value = recipe?.name ?? '';
  slot.value = recipe === undefined ? 'main' : toAppSlot(recipe.slot);
  rows.value = rowsOf(recipe);
  steps.value = recipe === undefined ? [''] : [...recipe.steps];
  prepMinutes.value = recipe?.prepMinutes ?? 20;
  batch.value = recipe?.batch ?? false;
  saveFailed.value = false;
});

const foodItems = computed((): { label: string; value: string }[] =>
  Object.values(foods)
    .map((food): { label: string; value: string } => ({ label: nameOf(food), value: food.id }))
    .sort((left, right): number => left.label.localeCompare(right.label)),
);

const slotItems = computed((): { label: string; value: RecipeSlot }[] =>
  CUSTOM_RECIPE_SLOTS.map((value): { label: string; value: RecipeSlot } => ({
    label: t(`library.myRecipes.slot.${value}`),
    value,
  })),
);

const addRow = (): void => {
  if (rows.value.length >= maxIngredients) return;
  rows.value = [...rows.value, { foodId: undefined, grams: 100 }];
};

const removeRow = (index: number): void => {
  rows.value = rows.value.filter((_row, current): boolean => current !== index);
};

const addStep = (): void => {
  if (steps.value.length >= maxSteps) return;
  steps.value = [...steps.value, ''];
};

const removeStep = (index: number): void => {
  steps.value = steps.value.filter((_step, current): boolean => current !== index);
};

// What the ingredients so far weigh out to — the auto-calculated macros the
// reader sees while still typing, the same way a chosen dish shows its
// nutrition in the recipe page itself.
const quantities = computed((): FoodQuantity[] =>
  rows.value
    .map(({ foodId, grams }): FoodQuantity | undefined => {
      if (foodId === undefined) return undefined;
      const food = foodOf(foodId);
      return food === undefined ? undefined : { food, grams };
    })
    .filter((quantity): quantity is FoodQuantity => quantity !== undefined),
);

const macros = computed((): Macros => macrosOfQuantities(quantities.value));

const trimmedSteps = computed((): string[] =>
  steps.value.map((step): string => step.trim()).filter((step): boolean => step.length > 0),
);

const isNameValid = computed((): boolean => {
  const trimmed = name.value.trim();
  return trimmed.length > 0 && trimmed.length <= maxNameLength;
});

const isIngredientsValid = computed(
  (): boolean =>
    quantities.value.length > 0 &&
    quantities.value.length === rows.value.length &&
    rows.value.every((row): boolean => row.grams > 0 && row.grams <= maxGramsPerIngredient),
);

const isStepsValid = computed(
  (): boolean =>
    trimmedSteps.value.length > 0 &&
    trimmedSteps.value.every((step): boolean => step.length <= maxStepLength),
);

const isPrepMinutesValid = computed(
  (): boolean => prepMinutes.value >= 0 && prepMinutes.value <= maxPrepMinutes,
);

const isValid = computed(
  (): boolean =>
    isNameValid.value && isIngredientsValid.value && isStepsValid.value && isPrepMinutesValid.value,
);

const submit = async (): Promise<void> => {
  if (!isValid.value) return;

  const input: CustomRecipeDraft = {
    name: name.value.trim(),
    slot: toGraphqlSlot(slot.value),
    ingredients: rows.value
      .filter((row): row is { foodId: string; grams: number } => row.foodId !== undefined)
      .map(({ foodId, grams }): { foodId: string; grams: number } => ({ foodId, grams })),
    steps: trimmedSteps.value,
    prepMinutes: prepMinutes.value,
    batch: batch.value,
  };

  isSaving.value = true;
  saveFailed.value = false;
  try {
    if (recipe === undefined) await create(input);
    else await update(recipe.id, input);
    open.value = false;
  } catch {
    saveFailed.value = true;
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEditing ? t('library.myRecipes.editTitle') : t('library.myRecipes.createTitle')"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <form class="flex flex-col gap-5" @submit.prevent="submit">
        <div class="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <UFormField :label="t('library.myRecipes.name')" required>
            <UInput
              v-model="name"
              :maxlength="maxNameLength"
              autofocus
              :placeholder="t('library.myRecipes.namePlaceholder')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('library.myRecipes.slotLabel')">
            <USelect v-model="slot" :items="slotItems" value-key="value" class="w-full" />
          </UFormField>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField :label="t('library.myRecipes.prepMinutes')">
            <UInput v-model.number="prepMinutes" type="number" min="0" :max="maxPrepMinutes" />
          </UFormField>
          <UFormField :label="t('library.myRecipes.batch')">
            <USwitch v-model="batch" :label="t('library.myRecipes.batchHint')" />
          </UFormField>
        </div>

        <fieldset class="flex flex-col gap-2">
          <legend class="mb-1 text-sm font-medium">{{ t('library.myRecipes.ingredients') }}</legend>

          <div v-for="(row, index) in rows" :key="index" class="flex items-center gap-2">
            <USelectMenu
              v-model="row.foodId"
              :items="foodItems"
              value-key="value"
              searchable
              :placeholder="t('library.myRecipes.ingredientPlaceholder')"
              class="min-w-0 flex-1"
            />
            <UInput
              v-model.number="row.grams"
              type="number"
              min="1"
              :max="maxGramsPerIngredient"
              class="w-24 shrink-0"
            >
              <template #trailing>
                <span class="text-sm text-muted">{{ t('library.myRecipes.gramsUnit') }}</span>
              </template>
            </UInput>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              size="sm"
              :disabled="rows.length <= 1"
              :aria-label="t('library.myRecipes.removeIngredient')"
              @click="removeRow(index)"
            />
          </div>

          <UButton
            icon="i-lucide-plus"
            variant="soft"
            color="neutral"
            size="sm"
            class="self-start"
            :disabled="rows.length >= maxIngredients"
            @click="addRow"
          >
            {{ t('library.myRecipes.addIngredient') }}
          </UButton>
        </fieldset>

        <div v-if="quantities.length > 0" class="space-y-2">
          <p class="text-sm text-muted">{{ t('library.myRecipes.autoMacros') }}</p>
          <RecipeNutritionFacts :macros="macros" />
        </div>

        <fieldset class="flex flex-col gap-2">
          <legend class="mb-1 text-sm font-medium">{{ t('library.myRecipes.steps') }}</legend>

          <div v-for="(_step, index) in steps" :key="index" class="flex items-start gap-2">
            <UTextarea
              v-model="steps[index]"
              :maxlength="maxStepLength"
              :rows="2"
              :placeholder="t('library.myRecipes.stepPlaceholder')"
              class="w-full flex-1"
            />
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              size="sm"
              :disabled="steps.length <= 1"
              :aria-label="t('library.myRecipes.removeStep')"
              @click="removeStep(index)"
            />
          </div>

          <UButton
            icon="i-lucide-plus"
            variant="soft"
            color="neutral"
            size="sm"
            class="self-start"
            :disabled="steps.length >= maxSteps"
            @click="addStep"
          >
            {{ t('library.myRecipes.addStep') }}
          </UButton>
        </fieldset>

        <UAlert
          v-if="saveFailed"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="t('library.myRecipes.saveFailed')"
        />
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="open = false">
          {{ t('library.myRecipes.cancel') }}
        </UButton>
        <UButton :disabled="!isValid" :loading="isSaving" @click="submit">
          {{ t('library.myRecipes.save') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
