<script setup lang="ts">
const query = defineModel<string>('query', { required: true });
const macroFilter = defineModel<MacroFilter>('macroFilter', { required: true });
const timeFilter = defineModel<TimeFilter>('timeFilter', { required: true });
const seasonOnly = defineModel<boolean>('seasonOnly', { required: true });

const { t } = useNuxtApp().$i18n;

const macroItems = computed((): SelectItem<MacroFilter>[] => [
  { label: t('library.filter.macro.all'), value: 'all' },
  { label: t('menu.macroShort.protein'), value: 'protein' },
  { label: t('menu.macroShort.carbs'), value: 'carbs' },
  { label: t('menu.macroShort.fat'), value: 'fat' },
]);

const timeItems = computed((): SelectItem<TimeFilter>[] => [
  { label: t('library.filter.time.all'), value: 'all' },
  { label: t('library.filter.time.quick'), value: 'quick' },
  { label: t('library.filter.time.medium'), value: 'medium' },
  { label: t('library.filter.time.long'), value: 'long' },
]);

const isFiltered = computed(
  (): boolean =>
    query.value !== '' ||
    macroFilter.value !== 'all' ||
    timeFilter.value !== 'all' ||
    seasonOnly.value,
);

const reset = (): void => {
  query.value = '';
  macroFilter.value = 'all';
  timeFilter.value = 'all';
  seasonOnly.value = false;
};
</script>

<template>
  <div class="space-y-3">
    <UInput
      v-model="query"
      icon="i-lucide-search"
      size="lg"
      :placeholder="$t('library.search.placeholder')"
      :aria-label="$t('library.search.label')"
    />

    <div class="flex flex-wrap items-center gap-2">
      <USelect
        v-model="macroFilter"
        :items="macroItems"
        value-key="value"
        :aria-label="$t('library.filter.macro.label')"
        class="w-40"
      />
      <USelect
        v-model="timeFilter"
        :items="timeItems"
        value-key="value"
        :aria-label="$t('library.filter.time.label')"
        class="w-40"
      />
      <USwitch v-model="seasonOnly" :label="$t('library.filter.season')" class="ml-1" />
      <UButton
        v-if="isFiltered"
        variant="ghost"
        color="neutral"
        size="sm"
        icon="i-lucide-rotate-ccw"
        class="ml-auto"
        @click="reset"
      >
        {{ $t('library.filter.reset') }}
      </UButton>
    </div>
  </div>
</template>
