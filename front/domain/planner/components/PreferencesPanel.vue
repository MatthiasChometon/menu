<script setup lang="ts">
import { DEFAULT_VARIETY_WINDOW_WEEKS } from '../composables/usePlannerHistory';

const open = defineModel<boolean>({ required: true });

const { preferences, toggleExcluded, setMaxPrepMinutes, setMaxRepeatsPerWeek } =
  usePlannerPreferences();
const { varietyWindowWeeksSetting, setVarietyWindowWeeks } = usePlannerHistory();
const { t } = useNuxtApp().$i18n;

// Only the savoury dishes come in fish, meat and vegetable — the same three
// kinds the picker itself filters by.
const KINDS: DishKind[] = ['fish', 'meat', 'veggie'];

const isExcluded = (kind: DishKind): boolean => preferences.value.excludedKinds.includes(kind);

// A short, sensible spread rather than a free number field: a limit nobody
// asked for is easier to reach for as a chip than to type out.
const PREP_PRESETS = [15, 20, 30, 45];
const REPEAT_PRESETS = [2, 3, 4];
const WINDOW_PRESETS = [2, 3, 4, 6];

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

const windowLabel = (weeks: number): string => `${weeks} ${t('planner.preferences.weeks')}`;

const windowItems = computed((): Option[] => [
  {
    label: `${t('planner.preferences.varietyWindowAuto')} (${windowLabel(DEFAULT_VARIETY_WINDOW_WEEKS)})`,
    value: undefined,
  },
  ...WINDOW_PRESETS.map((weeks): Option => ({ label: windowLabel(weeks), value: weeks })),
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
          :label="$t('planner.preferences.varietyWindow')"
          :help="$t('planner.preferences.varietyWindowHint')"
        >
          <USelect
            :model-value="varietyWindowWeeksSetting"
            :items="windowItems"
            value-key="value"
            class="w-full"
            @update:model-value="setVarietyWindowWeeks"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <UButton block @click="open = false">{{ $t('planner.preferences.done') }}</UButton>
    </template>
  </UModal>
</template>
