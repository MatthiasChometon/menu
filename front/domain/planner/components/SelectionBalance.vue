<script setup lang="ts">
const { selectionBalance } = usePlanner();
const { wordingOf } = useBalanceWording();
</script>

<template>
  <!-- Nothing to say until a week can be built at all: the dots above already
       show how many dishes are still needed, and two demands at once is one
       too many. -->
  <div v-if="selectionBalance.isReady" class="mt-4">
    <div
      v-if="selectionBalance.isBalanced"
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
