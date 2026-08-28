<script setup lang="ts">
import { MAX_LENGTH, MIN_LENGTH } from '../composables/usePlannerWeek';

const { week, weeks, length, isReady, go, canGo, labelOf, dateOf } = usePlannerWeek();

const options = computed((): SelectItem[] =>
  weeks.value.map((weekOf): SelectItem => ({ label: labelOf(weekOf), value: weekOf })),
);

const { t } = useNuxtApp().$i18n;

// Three to seven days. Never more: past a week a weekday would repeat, and the
// days are stored by weekday.
const lengthOptions = computed((): { label: string; value: number }[] =>
  Array.from({ length: MAX_LENGTH - MIN_LENGTH + 1 }, (_, offset): { label: string; value: number } => {
    const days = MIN_LENGTH + offset;
    return { label: `${days} ${t('planner.weekChoice.days')}`, value: days };
  }),
);
</script>

<template>
  <!-- Which days are being written into, said before anything is chosen for
       them. The window runs from a chosen day for a chosen length, so neither is
       obvious from the screen — and days saved into the wrong ones are only
       noticed when the fridge is empty. -->
  <div class="rounded-2xl border border-default bg-elevated/40 p-3">
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-calendar-days" class="size-4 shrink-0 text-dimmed" />
      <p class="text-sm text-muted">{{ $t('planner.weekChoice.lead') }}</p>
    </div>

    <!-- No window is named until the browser's date is known: a page built last
         month would call the wrong one "à partir d'aujourd'hui". -->
    <div v-if="!isReady" class="mt-2 flex items-center gap-2">
      <USkeleton class="size-8 rounded-md" />
      <USkeleton class="h-8 flex-1 rounded-md" />
      <USkeleton class="size-8 rounded-md" />
    </div>
    <span v-if="!isReady" class="sr-only">{{ $t('accessibility.loading') }}</span>

    <div v-else class="mt-2 flex items-center gap-1">
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="ghost"
        :disabled="!canGo(-1)"
        :aria-label="$t('menu.week.previous')"
        @click="go(-1)"
      />
      <USelect
        v-model="week"
        :items="options"
        value-key="value"
        class="min-w-0 flex-1 font-semibold"
        :aria-label="$t('planner.weekChoice.choose')"
      />
      <UButton
        icon="i-lucide-chevron-right"
        color="neutral"
        variant="ghost"
        :disabled="!canGo(1)"
        :aria-label="$t('planner.weekChoice.later')"
        @click="go(1)"
      />
    </div>

    <!-- The start date and the length together: what the window actually covers.
         Reserved either way, so it appearing after the fact does not push the
         first row of dishes down mid-tap. -->
    <div class="mt-2 flex min-h-8 flex-wrap items-center justify-between gap-2">
      <p class="px-1 text-xs text-muted">
        <span v-if="isReady">{{ $t('planner.weekChoice.from') }} {{ dateOf(week) }}</span>
      </p>
      <USelect
        v-if="isReady"
        v-model="length"
        :items="lengthOptions"
        value-key="value"
        size="sm"
        icon="i-lucide-arrow-right-left"
        class="w-28"
        :aria-label="$t('planner.weekChoice.duration')"
      />
    </div>
  </div>
</template>
