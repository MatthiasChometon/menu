<script setup lang="ts">
import type { MicroGap } from '../composables/useMicroGap';
import type { Menu } from '../../menu/types/menu.type';

const { menu } = defineProps<{ menu: Menu | undefined }>();

const { foods } = useFoods();
const { gapOf } = useMicroGap();
const { unitOf } = useMicros();
const { nameOf } = useFoodFormat();

const gap = computed((): MicroGap | undefined =>
  menu === undefined ? undefined : gapOf(menu, Object.values(foods)),
);
</script>

<template>
  <section class="rise rounded-2xl border border-default bg-elevated/40 p-4 sm:p-5">
    <h2 class="mb-1 text-lg font-semibold">{{ $t('insights.micro.title') }}</h2>
    <p class="mb-4 text-sm text-muted">{{ $t('insights.micro.lead') }}</p>

    <div
      v-if="gap === undefined"
      class="rounded-xl border border-dashed border-default p-6 text-center"
    >
      <UIcon name="i-lucide-sparkles" class="mx-auto size-8 text-dimmed" aria-hidden="true" />
      <p class="mt-3 text-sm text-muted">{{ $t('insights.micro.empty') }}</p>
    </div>

    <div v-else class="rounded-xl bg-default p-4">
      <p class="text-lg font-semibold">{{ $t(`insights.micro.key.${gap.key}`) }}</p>
      <p class="mt-1 text-sm text-muted tabular-nums">
        {{ Math.round(gap.averagePercentOfTarget) }}% {{ $t('insights.micro.ofTarget') }}
      </p>

      <p v-if="gap.suggestion !== undefined" class="mt-3 text-sm">
        {{ $t('insights.micro.suggestion') }}
        <strong>{{ nameOf(gap.suggestion) }}</strong
        >{{ ' ' }}
        <span class="text-muted tabular-nums">
          {{ gap.suggestion.micros[gap.key] }} {{ unitOf(gap.key) }}
          {{ $t('insights.micro.per100g') }}
        </span>
      </p>
    </div>
  </section>
</template>
