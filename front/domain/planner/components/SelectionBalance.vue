<script setup lang="ts">
import type { MacroGap } from '../composables/usePlanner';

const { selectionBalance } = usePlanner();
const { wordingOf } = useBalanceWording();
const { t } = useNuxtApp().$i18n;

const kcal = computed((): MacroGap | undefined =>
  selectionBalance.value.all.find((gap): boolean => gap.macro === 'kcal'),
);

// The rest as dots: present, readable at a glance, and silent while they are
// where they should be.
const others = computed((): { gap: MacroGap; isInside: boolean; label: string }[] =>
  selectionBalance.value.all
    .filter((gap): boolean => gap.macro !== 'kcal')
    .map((gap) => ({
      gap,
      isInside: Math.abs(gap.gapPercent) <= selectionBalance.value.toleranceOf(gap.macro),
      label: t(`menu.macroLong.${gap.macro}`),
    })),
);
</script>

<template>
  <!-- Nothing to say until a week can be built at all: the dots above already
       show how many dishes are still needed, and two demands at once is one
       too many. -->
  <div v-if="selectionBalance.isReady" class="mt-4 space-y-3">
    <div class="rounded-xl border border-default px-3 py-3">
      <PlannerBalanceGauge
        v-if="kcal"
        :gap="kcal"
        :tolerance="selectionBalance.toleranceOf('kcal')"
        :label="$t('menu.macroLong.kcal')"
      />

      <ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        <li
          v-for="entry in others"
          :key="entry.gap.macro"
          class="flex items-center gap-1.5 text-xs"
          :class="entry.isInside ? 'text-muted' : 'text-warning'"
        >
          <span
            class="size-2 rounded-full transition-colors duration-500 motion-reduce:transition-none"
            :class="entry.isInside ? 'bg-primary' : 'bg-warning'"
            aria-hidden="true"
          />
          {{ entry.label }}
        </li>
      </ul>
    </div>

    <!-- Said plainly while meals are still missing: a cursor sitting low then
         means the week is unfinished, not that the dishes chosen are wrong. -->
    <div
      v-if="!selectionBalance.isComplete"
      class="flex items-start gap-2 rounded-xl border border-default bg-elevated/40 px-3 py-2 text-sm"
    >
      <UIcon name="i-lucide-hourglass" class="mt-0.5 size-5 shrink-0 text-muted" />
      <span>
        <span class="font-semibold">{{ $t('planner.balance.unfinished') }}</span>
        <span class="text-muted"> — {{ $t('planner.balance.unfinishedHint') }}</span>
      </span>
    </div>

    <div
      v-else-if="selectionBalance.isBalanced"
      class="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-sm"
    >
      <UIcon name="i-lucide-circle-check" class="size-5 shrink-0 text-primary" />
      <span>
        <span class="font-semibold">{{ $t('planner.balance.enough') }}</span>
        {{ $t('planner.balance.enoughHint') }}
      </span>
    </div>

    <div
      v-else
      class="flex items-start gap-2 rounded-xl border border-default bg-elevated/40 px-3 py-2 text-sm"
    >
      <UIcon name="i-lucide-scale" class="mt-0.5 size-5 shrink-0 text-muted" />
      <span>
        <span class="text-muted">{{ $t('planner.balance.with') }}</span>
        <span v-for="(gap, index) in selectionBalance.gaps" :key="gap.macro" class="font-semibold">
          {{ index > 0 ? ', ' : ' ' }}{{ wordingOf(gap) }}
        </span>
      </span>
    </div>
  </div>
</template>
