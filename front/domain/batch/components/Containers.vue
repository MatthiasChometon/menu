<script setup lang="ts">
const { groups } = defineProps<{ groups: ContainerGroup[] }>();

const { nameOf } = useFoodFormat();
const { dateLabelOf } = useBatchContainers();

const totalContainers = computed((): number =>
  groups.reduce((total, group): number => total + group.labels.length, 0),
);
</script>

<template>
  <section v-if="groups.length > 0" class="rise">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="text-xl font-bold">{{ $t('batch.containers.title') }}</h2>
      <p class="text-sm text-muted">
        <span class="font-bold tabular-nums text-primary">{{ totalContainers }}</span>
        {{ $t('batch.containers.count') }}
      </p>
    </div>
    <p class="mt-1 text-sm text-muted">{{ $t('batch.containers.hint') }}</p>

    <div class="mt-4 space-y-3">
      <div v-for="group in groups" :key="group.recipe.id" class="rounded-2xl border border-default p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="min-w-0 flex-1 truncate font-semibold">{{ nameOf(group.recipe) }}</p>
          <span class="shrink-0 rounded-full bg-elevated px-2 py-0.5 text-xs font-semibold tabular-nums">
            {{ group.labels.length }}
          </span>
        </div>

        <ul class="mt-2 flex flex-wrap gap-1.5">
          <li
            v-for="label in group.labels"
            :key="label.id"
            class="inline-flex items-center gap-1.5 rounded-full border border-default bg-elevated/40 py-1 pr-2.5 pl-1"
          >
            <span
              class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {{ $t(`menu.day.${label.day}`) }} · {{ $t(`menu.meal.${label.slot}`) }}
            </span>
            <span class="text-xs text-muted">
              {{ $t('batch.containers.bestBefore') }} {{ dateLabelOf(label.bestBefore) }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
