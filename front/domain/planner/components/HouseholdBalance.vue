<script setup lang="ts">
import type { MacroGap } from '../composables/usePlanner';
import type { EaterVerdict } from '../composables/useHouseholdBalance';

const { days, targets } = usePlanner();
const { eaters } = useHouseholdQuantities();
const { verdictsFor } = useHouseholdBalance();
const { wordingOf } = useBalanceWording();
const { t } = useNuxtApp().$i18n;

// Only worth showing once somebody else eats too: alone, this repeats what the
// week already says above.
const verdicts = computed(() =>
  eaters.value.length < 2 ? [] : verdictsFor(days.value, eaters.value, targets.value),
);

// Joined here rather than in the template: the separator is punctuation, and
// punctuation in a template is text nobody can translate.
const gapsOf = (gaps: MacroGap[]): string => gaps.map(wordingOf).join(', ');

// When more macros are off than are worth naming, the honest summary is that
// the week does not suit this person — followed by the two that matter most,
// so the reader still knows where to look.
const verdictOf = (verdict: EaterVerdict): string =>
  verdict.isWayOff
    ? `${t('planner.household.wayOff')} — ${t('planner.household.wayOffHint')} ${gapsOf(verdict.gaps).toLowerCase()}`
    : gapsOf(verdict.gaps);
</script>

<template>
  <section v-if="verdicts.length > 0" class="rise mt-6 rounded-2xl border border-default p-5">
    <h2 class="font-bold">{{ $t('planner.household.title') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('planner.household.lead') }}</p>

    <ul class="mt-3 space-y-2">
      <li
        v-for="verdict in verdicts"
        :key="verdict.eater.id"
        class="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
      >
        <span class="min-w-0 truncate font-medium">{{ verdict.eater.name }}</span>

        <span v-if="verdict.isBalanced" class="flex items-center gap-1.5 text-primary sm:shrink-0">
          <UIcon name="i-lucide-circle-check" class="size-4" />
          {{ $t('planner.household.fits') }}
        </span>

        <span v-else class="text-muted sm:max-w-[60%] sm:text-right">{{ verdictOf(verdict) }}</span>
      </li>
    </ul>
  </section>
</template>
