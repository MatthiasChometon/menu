<script setup lang="ts">
const { plan } = defineProps<{ plan: BatchPlan }>();

const { nameOf } = useFoodFormat();

const saved = computed((): number => Math.max(0, plan.totalMinutes - plan.makespanMinutes));

const handsOnMinutesOf = (step: BatchTimelineStep): number => step.handsOnUntil - step.startsAt;

const passiveMinutesOf = (step: BatchTimelineStep): number => step.endsAt - step.handsOnUntil;

const hasPassivePhase = (step: BatchTimelineStep): boolean => passiveMinutesOf(step) > 0;

// The dish that decides how long the whole session runs is not necessarily
// the last one picked up — a long simmer started early can outlast dishes
// begun later.
const isLastToFinish = (step: BatchTimelineStep): boolean => step.endsAt === plan.makespanMinutes;

const widthOf = (minutes: number): string =>
  `${plan.makespanMinutes === 0 ? 0 : (minutes / plan.makespanMinutes) * 100}%`;
</script>

<template>
  <section v-if="plan.timeline.length > 0" class="rise">
    <h2 class="text-xl font-bold">{{ $t('batch.timeline.title') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('batch.timeline.hint') }}</p>

    <p
      v-if="saved > 0"
      class="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm text-primary"
    >
      <UIcon name="i-lucide-flame" class="size-4 shrink-0" aria-hidden="true" />
      {{ $t('batch.timeline.readyIn') }}
      <span class="font-bold tabular-nums">
        {{ plan.makespanMinutes }} {{ $t('batch.minutes') }}
      </span>
      {{ $t('batch.timeline.insteadOf') }}
      <span class="font-semibold tabular-nums">{{ plan.totalMinutes }} {{ $t('batch.minutes') }}</span>
    </p>

    <ol class="mt-4 space-y-4 border-l-2 border-default pl-4">
      <li v-for="step in plan.timeline" :key="step.task.recipe.id" class="relative">
        <span
          class="absolute top-1 -left-[1.4rem] size-3 rounded-full border-2 border-default bg-primary"
          aria-hidden="true"
        />

        <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p class="font-semibold">{{ nameOf(step.task.recipe) }}</p>
          <p class="shrink-0 text-xs tabular-nums text-dimmed">
            {{ $t('batch.timeline.startsAt') }} {{ step.startsAt }} {{ $t('batch.minutes') }}
          </p>
        </div>

        <div
          class="mt-2 flex h-2.5 overflow-hidden rounded-full bg-elevated"
          role="img"
          :aria-label="`${nameOf(step.task.recipe)} : ${step.task.minutes} ${$t('batch.minutes')}`"
        >
          <div
            class="h-full rounded-full bg-primary"
            :style="{ width: widthOf(handsOnMinutesOf(step)) }"
          />
          <div
            v-if="hasPassivePhase(step)"
            class="h-full bg-primary/25 [background-image:repeating-linear-gradient(45deg,transparent,transparent_3px,color-mix(in_oklab,var(--ui-primary)_35%,transparent)_3px,color-mix(in_oklab,var(--ui-primary)_35%,transparent)_5px)]"
            :style="{ width: widthOf(passiveMinutesOf(step)) }"
          />
        </div>

        <p class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
          <span class="inline-flex items-center gap-1">
            <UIcon name="i-lucide-utensils" class="size-3.5 shrink-0" aria-hidden="true" />
            {{ $t('batch.timeline.handsOn') }}
          </span>
          <span v-if="hasPassivePhase(step)" class="inline-flex items-center gap-1">
            <UIcon name="i-lucide-flame" class="size-3.5 shrink-0" aria-hidden="true" />
            {{ $t('batch.timeline.simmers') }}
            <span class="tabular-nums">
              {{ passiveMinutesOf(step) }} {{ $t('batch.minutes') }}
            </span>
          </span>
          <span
            v-if="isLastToFinish(step)"
            class="inline-flex items-center gap-1 font-semibold text-primary"
          >
            <UIcon name="i-lucide-check" class="size-3.5 shrink-0" aria-hidden="true" />
            {{ $t('batch.timeline.doneAt') }}
            <span class="tabular-nums">{{ step.endsAt }} {{ $t('batch.minutes') }}</span>
          </span>
        </p>
      </li>
    </ol>
  </section>
</template>
