<script setup lang="ts">
const open = defineModel<boolean>({ required: true });

const { preferences, toggleExcluded, setMaxPrepMinutes, setMaxRepeatsPerWeek, setWeeklyBudget } =
  usePlannerPreferences();
const { t } = useNuxtApp().$i18n;

// A free amount, not a preset: unlike prep time or repeats, a budget is a
// number the reader already has in mind, not one they are picking from a
// short list. Kept as a string while it is being typed and only turned into
// a preference on blur, so "5" does not clear itself the moment a "0" is
// backspaced into "50".
const budgetInput = ref<string>(preferences.value.weeklyBudget?.toString() ?? '');

watch(
  (): number | undefined => preferences.value.weeklyBudget,
  (budget): void => {
    budgetInput.value = budget?.toString() ?? '';
  },
);

const commitBudget = (): void => {
  const typed = budgetInput.value.trim();
  setWeeklyBudget(typed === '' ? undefined : Number(typed));
};

// Only the savoury dishes come in fish, meat and vegetable — the same three
// kinds the picker itself filters by.
const KINDS: DishKind[] = ['fish', 'meat', 'veggie'];

const isExcluded = (kind: DishKind): boolean => preferences.value.excludedKinds.includes(kind);

// A short, sensible spread rather than a free number field: a limit nobody
// asked for is easier to reach for as a chip than to type out.
const PREP_PRESETS = [15, 20, 30, 45];
const REPEAT_PRESETS = [2, 3, 4];

type Option = { label: string; value: number | undefined };

const prepItems = computed((): Option[] => [
  { label: t('planner.preferences.maxPrepNone'), value: undefined },
  ...PREP_PRESETS.map((minutes): Option => ({ label: `${minutes} ${t('recipe.minutes')}`, value: minutes })),
]);

const repeatItems = computed((): Option[] => [
  { label: t('planner.preferences.maxRepeatsNone'), value: undefined },
  ...REPEAT_PRESETS.map((count): Option => ({
    label: `${count} ${t('planner.preferences.timesPerWeek')}`,
    value: count,
  })),
]);
</script>

<template>
  <UModal v-model:open="open" :title="$t('planner.preferences.title')">
    <template #body>
      <div class="space-y-5">
        <p class="text-sm text-muted">{{ $t('planner.preferences.lead') }}</p>

        <fieldset>
          <legend class="mb-2 text-sm font-medium">{{ $t('planner.preferences.avoid') }}</legend>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="kind in KINDS"
              :key="kind"
              type="button"
              size="sm"
              :variant="isExcluded(kind) ? 'solid' : 'outline'"
              :color="isExcluded(kind) ? 'error' : 'neutral'"
              :aria-pressed="isExcluded(kind)"
              @click="toggleExcluded(kind)"
            >
              {{ $t(`planner.filter.${kind}`) }}
            </UButton>
          </div>
        </fieldset>

        <UFormField :label="$t('planner.preferences.maxPrep')">
          <USelect
            :model-value="preferences.maxPrepMinutes"
            :items="prepItems"
            value-key="value"
            class="w-full"
            @update:model-value="setMaxPrepMinutes"
          />
        </UFormField>

        <UFormField :label="$t('planner.preferences.maxRepeats')">
          <USelect
            :model-value="preferences.maxRepeatsPerWeek"
            :items="repeatItems"
            value-key="value"
            class="w-full"
            @update:model-value="setMaxRepeatsPerWeek"
          />
        </UFormField>

        <UFormField
          :label="$t('planner.preferences.weeklyBudget')"
          :hint="$t('planner.preferences.weeklyBudgetHint')"
        >
          <UInput
            v-model="budgetInput"
            type="number"
            min="0"
            inputmode="numeric"
            class="w-full"
            :placeholder="$t('planner.preferences.weeklyBudgetNone')"
            :ui="{ trailing: 'pointer-events-none' }"
            @blur="commitBudget"
            @keydown.enter="commitBudget"
          >
            <template #trailing>
              <span class="text-sm text-muted" aria-hidden="true">€</span>
            </template>
          </UInput>
        </UFormField>
      </div>
    </template>

    <template #footer>
      <UButton block @click="open = false">{{ $t('planner.preferences.done') }}</UButton>
    </template>
  </UModal>
</template>
