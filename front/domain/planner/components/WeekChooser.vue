<script setup lang="ts">
const { week, weeks, isReady, go, canGo, labelOf, dateOf } = usePlannerWeek();

const options = computed((): SelectItem[] =>
  weeks.value.map((weekOf): SelectItem => ({ label: labelOf(weekOf), value: weekOf })),
);
</script>

<template>
  <!-- Which week is being written into, said before anything is chosen for it.
       Composing is done ahead, so the date is never obvious from the screen —
       and a week saved into the wrong one is only noticed on the Monday. -->
  <div class="rounded-2xl border border-default bg-elevated/40 p-3">
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-calendar-days" class="size-4 shrink-0 text-dimmed" />
      <p class="text-sm text-muted">{{ $t('planner.weekChoice.lead') }}</p>
    </div>

    <!-- No week is named until the browser's date is known: a page built last
         month would call the wrong one "cette semaine". -->
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

    <!-- Reserved either way: the date appearing under the picker after the
         fact would push the first row of dishes down mid-tap. -->
    <p class="mt-1.5 min-h-4 px-1 text-xs text-muted">
      <span v-if="isReady">{{ $t('menu.weekOf') }} {{ dateOf(week) }}</span>
    </p>
  </div>
</template>
