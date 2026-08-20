<script setup lang="ts">
import type { GroceryJob } from '../composables/useGroceryOrder';

const { job } = defineProps<{ job: GroceryJob }>();

const added = computed(
  (): number => job.events.filter((event): boolean => event.kind === 'LINE_ADDED').length,
);

const missing = computed((): GroceryJob['events'] =>
  job.events.filter(
    (event): boolean => event.kind === 'LINE_MISSING' || event.kind === 'LINE_SUBSTITUTED',
  ),
);

const isWaiting = computed((): boolean => job.status === 'PENDING');
</script>

<template>
  <div>
    <p class="text-sm font-semibold">{{ $t(`order.status.${job.status}`) }}</p>

    <p v-if="isWaiting" class="mt-1 text-xs text-muted">{{ $t('order.waitingHint') }}</p>

    <p v-if="added > 0" class="mt-1 text-sm tabular-nums text-muted">
      {{ added }} / {{ job.lines.length }} {{ $t('order.linesDone') }}
    </p>

    <OrderCost :job="job" class="mt-3" />

    <div v-if="missing.length > 0" class="mt-3">
      <h3 class="text-sm font-semibold">{{ $t('order.needsYou') }}</h3>
      <ul class="mt-1 space-y-1 text-sm text-muted">
        <li v-for="event in missing" :key="event.id">
          <span class="font-medium">{{ event.label ?? event.foodId }}</span>
          <span v-if="event.detail"> — {{ event.detail }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
