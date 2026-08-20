<script setup lang="ts">
import type { GroceryJob } from '../composables/useGroceryOrder';

const { job } = defineProps<{ job: GroceryJob }>();

const { format } = useMoney();

const total = computed((): number | undefined => {
  if (job.productsCents === null || job.productsCents === undefined) return undefined;

  return job.productsCents + (job.deliveryFeesCents ?? 0);
});

const isBelowMinimum = computed((): boolean => (job.shortOfMinimumCents ?? 0) > 0);
</script>

<template>
  <div v-if="job.productsCents !== null && job.productsCents !== undefined">
    <h3 class="text-sm font-semibold">{{ $t('order.cost.title') }}</h3>

    <dl class="mt-1 space-y-0.5 text-sm">
      <div class="flex justify-between gap-3">
        <dt class="text-muted">{{ $t('order.cost.groceries') }}</dt>
        <dd class="tabular-nums">{{ format(job.productsCents) }}</dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-muted">{{ $t('order.cost.delivery') }}</dt>
        <dd class="tabular-nums">{{ format(job.deliveryFeesCents) }}</dd>
      </div>
      <div class="flex justify-between gap-3 font-semibold">
        <dt>{{ $t('order.cost.total') }}</dt>
        <dd class="tabular-nums">{{ format(total) }}</dd>
      </div>
    </dl>

    <p v-if="isBelowMinimum" class="mt-2 text-sm text-error" role="alert">
      {{ $t('order.cost.belowMinimum') }}
      <span class="font-semibold tabular-nums">{{ format(job.shortOfMinimumCents) }}</span>
    </p>

    <p v-else-if="job.overThreshold" class="mt-2 text-sm text-warning" role="alert">
      {{ $t('order.cost.overThreshold') }}
      <span class="tabular-nums">{{ format(job.alertThresholdCents) }}</span>
    </p>
  </div>
</template>
