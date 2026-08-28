<script setup lang="ts">
import type { GroceryJob } from '../composables/useGroceryOrder';

const { job } = defineProps<{ job: GroceryJob }>();

const total = computed((): number => job.lines.length);
const added = computed(
  (): number => job.events.filter((event): boolean => event.kind === 'LINE_ADDED').length,
);

const missing = computed((): GroceryJob['events'] =>
  job.events.filter(
    (event): boolean => event.kind === 'LINE_MISSING' || event.kind === 'LINE_SUBSTITUTED',
  ),
);

// How far the basket is filled. Nothing to buy reads as done, not stuck at zero.
const percent = computed((): number =>
  total.value === 0 ? 100 : Math.round((added.value / total.value) * 100),
);

const isWaiting = computed((): boolean => job.status === 'PENDING');
const isRunning = computed((): boolean => job.status === 'RUNNING');
const isDone = computed((): boolean => job.status === 'SUCCEEDED');
const hasStalled = computed((): boolean => job.status === 'FAILED' || job.status === 'BLOCKED');

// The line just placed, so the reader watches the basket move item by item rather
// than stare at a bar that only says "in progress".
const lastAdded = computed((): string | undefined => {
  const placed = job.events.filter((event): boolean => event.kind === 'LINE_ADDED');
  const last = placed.at(-1);

  return (last?.label ?? last?.foodId) ?? undefined;
});

const icon = computed((): string => {
  if (isDone.value) return 'i-lucide-circle-check';
  if (hasStalled.value) return 'i-lucide-circle-alert';
  if (isWaiting.value) return 'i-lucide-clock';

  return 'i-lucide-loader-circle';
});

// The bar carries the state's colour: green once the basket is ready, red when a
// run stops for the reader, the app's own primary while it works.
const barClass = computed((): string => {
  if (isDone.value) return 'bg-success';
  if (hasStalled.value) return 'bg-error';

  return 'bg-primary';
});

const showBar = computed((): boolean => isRunning.value || isDone.value || added.value > 0);
</script>

<template>
  <div>
    <div class="flex items-center gap-2">
      <UIcon
        :name="icon"
        class="size-4 shrink-0"
        :class="[
          isDone ? 'text-success' : hasStalled ? 'text-error' : 'text-primary',
          isRunning && 'animate-spin',
        ]"
      />
      <p class="text-sm font-semibold">{{ $t(`order.status.${job.status}`) }}</p>
      <span
        v-if="showBar"
        class="ml-auto text-sm font-semibold tabular-nums"
        :class="isDone ? 'text-success' : 'text-muted'"
      >
        {{ added }} / {{ total }}
      </span>
    </div>

    <!-- The bar itself, and under it the line moving into the basket right now:
         the two together answer "where is it" far better than a spinner. -->
    <div v-if="showBar" class="mt-2">
      <div
        class="h-2 w-full overflow-hidden rounded-full bg-elevated"
        role="progressbar"
        :aria-valuenow="percent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          class="h-full rounded-full transition-all duration-500"
          :class="barClass"
          :style="{ width: `${percent}%` }"
        />
      </div>
      <p v-if="isRunning && lastAdded !== undefined" class="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
        <UIcon name="i-lucide-plus" class="size-3 shrink-0 text-primary" />
        <span class="truncate">{{ lastAdded }}</span>
      </p>
      <p v-else-if="added > 0" class="mt-1.5 text-xs text-muted">
        {{ added }} {{ $t('order.linesDone') }}
      </p>
    </div>

    <p v-if="isWaiting" class="mt-1 text-xs text-muted">{{ $t('order.waitingHint') }}</p>

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
