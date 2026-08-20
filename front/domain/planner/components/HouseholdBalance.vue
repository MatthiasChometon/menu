<script setup lang="ts">
import type { MacroGap } from '../composables/usePlanner';

const { days, targets } = usePlanner();
const { eaters } = useHouseholdQuantities();
const { verdictsFor } = useHouseholdBalance();
const { wordingOf } = useBalanceWording();

// Only worth showing once somebody else eats too: alone, this repeats what the
// week already says above.
const verdicts = computed(() =>
  eaters.value.length < 2 ? [] : verdictsFor(days.value, eaters.value, targets.value),
);

// Joined here rather than in the template: the separator is punctuation, and
// punctuation in a template is text nobody can translate.
const gapsOf = (gaps: MacroGap[]): string => gaps.map(wordingOf).join(', ');
</script>

<template>
  <section v-if="verdicts.length > 0" class="rise mt-6 rounded-2xl border border-default p-5">
    <h2 class="font-bold">{{ $t('planner.household.title') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('planner.household.lead') }}</p>

    <ul class="mt-3 space-y-2">
      <li
        v-for="verdict in verdicts"
        :key="verdict.eater.id"
        class="flex items-start justify-between gap-3 text-sm"
      >
        <span class="min-w-0 truncate font-medium">{{ verdict.eater.name }}</span>

        <span v-if="verdict.isBalanced" class="flex shrink-0 items-center gap-1.5 text-primary">
          <UIcon name="i-lucide-circle-check" class="size-4" />
          {{ $t('planner.household.fits') }}
        </span>

        <span v-else class="shrink-0 text-right text-muted">{{ gapsOf(verdict.gaps) }}</span>
      </li>
    </ul>
  </section>
</template>
