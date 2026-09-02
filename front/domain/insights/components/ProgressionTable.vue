<script setup lang="ts">
import type { ProgressionHint, ProgressionWeek } from '../composables/useProgressionTable';

// Two diaries kept for their own reasons, read together here for the first
// time: what got eaten against plan, and what the scale did those same
// weeks.
const { history } = useAdherence(undefined);
const { entries } = useWeightLog();
const { weeksOf, hintOf } = useProgressionTable();
const { locale } = useNuxtApp().$i18n;
const localePath = useLocalePath();

const weeks = computed((): ProgressionWeek[] => weeksOf(history.value, entries.value));
const hint = computed((): ProgressionHint => hintOf(weeks.value));
const isEmpty = computed((): boolean => weeks.value.length === 0);

const dateLabelOf = (weekOf: string): string =>
  new Date(`${weekOf}T00:00:00`).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'short',
  });

const weightChangeLabelOf = (week: ProgressionWeek): string | undefined =>
  week.weightDeltaKg === undefined
    ? undefined
    : `${week.weightDeltaKg > 0 ? '+' : ''}${week.weightDeltaKg.toFixed(1)} kg`;
</script>

<template>
  <section class="rise rounded-2xl border border-default bg-elevated/40 p-4 sm:p-5">
    <h2 class="mb-1 text-lg font-semibold">{{ $t('insights.progression.title') }}</h2>
    <p class="mb-4 text-sm text-muted">{{ $t('insights.progression.lead') }}</p>

    <div v-if="isEmpty" class="rounded-xl border border-dashed border-default p-6 text-center">
      <UIcon name="i-lucide-line-chart" class="mx-auto size-8 text-dimmed" aria-hidden="true" />
      <p class="mt-3 text-sm text-muted">{{ $t('insights.progression.empty') }}</p>
      <div class="mt-4 flex flex-wrap justify-center gap-2">
        <UButton :to="localePath('/poids')" size="sm" variant="outline" color="neutral">
          {{ $t('insights.progression.ctaWeight') }}
        </UButton>
        <UButton :to="localePath('/')" size="sm" variant="outline" color="neutral">
          {{ $t('insights.progression.ctaWeek') }}
        </UButton>
      </div>
    </div>

    <template v-else>
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-dimmed">
            <th scope="col" class="py-1.5 font-medium">{{ $t('insights.progression.week') }}</th>
            <th scope="col" class="py-1.5 font-medium">
              {{ $t('insights.progression.adherence') }}
            </th>
            <th scope="col" class="py-1.5 font-medium">
              {{ $t('insights.progression.weightChange') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="week in weeks" :key="week.weekOf" class="border-t border-default">
            <td class="py-2">{{ dateLabelOf(week.weekOf) }}</td>
            <td class="py-2 tabular-nums">{{ Math.round(week.adherenceRate * 100) }}%</td>
            <td class="py-2 tabular-nums">
              <span v-if="weightChangeLabelOf(week) !== undefined">{{
                weightChangeLabelOf(week)
              }}</span>
              <span v-else class="text-dimmed">—</span>
            </td>
          </tr>
        </tbody>
      </table>

      <p class="mt-4 text-sm text-muted">{{ $t(`insights.progression.hint.${hint}`) }}</p>
    </template>
  </section>
</template>
