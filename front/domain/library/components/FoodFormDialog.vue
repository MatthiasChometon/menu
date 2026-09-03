<script setup lang="ts">
import { customFoodFormConstraints } from '../../customCatalog/utils/constraints';
import type { CustomFood, CustomFoodDraft } from '../../customCatalog/types/customCatalog.type';

// Creates or edits one of the reader's own foods. Editing is told apart from
// creating by whether a food was handed in at all, so the same dialog and the
// same validation serve both — a second form would only ever drift from this one.
const { food } = defineProps<{ food?: CustomFood }>();
const open = defineModel<boolean>({ required: true });

const { create, update } = useMyFoods();
const { t } = useNuxtApp().$i18n;
const { maxNameLength, maxKcal, maxMacro, maxPricePerKg } = customFoodFormConstraints();

const isEditing = computed((): boolean => food !== undefined);

const blankDraft = (): CustomFoodDraft => ({
  name: '',
  kcal: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  fiber: 0,
  pricePerKg: 0,
});

const draft = ref<CustomFoodDraft>(food === undefined ? blankDraft() : { ...food });
const isSaving = ref(false);
const saveFailed = ref(false);

// Reset to a blank sheet (or the food being edited) each time the dialog
// opens: closing it on a half-filled form should not leave that draft behind
// for the next food it is asked to create.
watch(open, (isOpen): void => {
  if (!isOpen) return;
  draft.value = food === undefined ? blankDraft() : { ...food };
  saveFailed.value = false;
});

const isNameValid = computed((): boolean => {
  const trimmed = draft.value.name.trim();
  return trimmed.length > 0 && trimmed.length <= maxNameLength;
});

const isMacroValid = (value: number, max: number): boolean => value >= 0 && value <= max;

const isValid = computed(
  (): boolean =>
    isNameValid.value &&
    isMacroValid(draft.value.kcal, maxKcal) &&
    isMacroValid(draft.value.protein, maxMacro) &&
    isMacroValid(draft.value.fat, maxMacro) &&
    isMacroValid(draft.value.carbs, maxMacro) &&
    isMacroValid(draft.value.fiber, maxMacro) &&
    isMacroValid(draft.value.pricePerKg, maxPricePerKg),
);

const submit = async (): Promise<void> => {
  if (!isValid.value) return;

  isSaving.value = true;
  saveFailed.value = false;
  try {
    const input: CustomFoodDraft = { ...draft.value, name: draft.value.name.trim() };
    if (food === undefined) await create(input);
    else await update(food.id, input);
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
    :title="isEditing ? t('library.myFoods.editTitle') : t('library.myFoods.createTitle')"
  >
    <template #body>
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <UFormField :label="t('library.myFoods.name')" required>
          <UInput
            v-model="draft.name"
            :maxlength="maxNameLength"
            autofocus
            :placeholder="t('library.myFoods.namePlaceholder')"
            class="w-full"
          />
        </UFormField>

        <p class="text-xs text-muted">{{ t('library.myFoods.per100g') }}</p>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <UFormField :label="t('library.myFoods.kcal')">
            <UInput v-model.number="draft.kcal" type="number" min="0" :max="maxKcal" />
          </UFormField>
          <UFormField :label="t('library.myFoods.protein')">
            <UInput v-model.number="draft.protein" type="number" min="0" :max="maxMacro" />
          </UFormField>
          <UFormField :label="t('library.myFoods.fat')">
            <UInput v-model.number="draft.fat" type="number" min="0" :max="maxMacro" />
          </UFormField>
          <UFormField :label="t('library.myFoods.carbs')">
            <UInput v-model.number="draft.carbs" type="number" min="0" :max="maxMacro" />
          </UFormField>
          <UFormField :label="t('library.myFoods.fiber')">
            <UInput v-model.number="draft.fiber" type="number" min="0" :max="maxMacro" />
          </UFormField>
          <UFormField :label="t('library.myFoods.pricePerKg')">
            <UInput v-model.number="draft.pricePerKg" type="number" min="0" :max="maxPricePerKg" />
          </UFormField>
        </div>

        <UAlert
          v-if="saveFailed"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="t('library.myFoods.saveFailed')"
        />
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="open = false">
          {{ t('library.myFoods.cancel') }}
        </UButton>
        <UButton :disabled="!isValid" :loading="isSaving" @click="submit">
          {{ t('library.myFoods.save') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
