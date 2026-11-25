<script setup lang="ts">
import type { CoachAdvice, CoachStatus } from '../composables/useWeightCoach';

// The verdict on its own card, apart from the chart: it is the one line
// somebody actually acts on, and a card says so more plainly than an
// annotation sitting on top of a line they still have to interpret.
const { entries } = useWeightLog();
const { adviceOf } = useWeightCoach();
const { hasAnswered, adjustTargets } = useProfile();
const { t } = useNuxtApp().$i18n;

const advice = computed((): CoachAdvice => adviceOf(entries.value));

// Only offered once there is a saved profile to adjust — the mutation itself
// refuses otherwise — and only for a verdict that actually suggests a change.
const canAdjust = computed(
  (): boolean => advice.value.kcalAdjustment !== undefined && hasAnswered.value,
);

const isAdjusting = ref(false);
const { hasFailed: adjustFailed, run } = useAttempt();
const justAdjusted = ref(false);

// Never applied silently: this only ever runs from the explicit click below,
// and resets the moment the verdict itself changes — a "done" left over from
// yesterday's advice would look like it confirmed today's.
watch(
  (): CoachStatus => advice.value.status,
  (): void => {
    justAdjusted.value = false;
  },
);

const applyAdjustment = async (): Promise<void> => {
  const delta = advice.value.kcalAdjustment;
  if (delta === undefined) return;

  isAdjusting.value = true;
  try {
    await run(() => adjustTargets(delta));
    justAdjusted.value = !adjustFailed.value;
  } finally {
    isAdjusting.value = false;
  }
};

// Literal keys, so the translation checker sees every one of them.
const titles = computed((): Record<CoachStatus, string> => ({
  notEnoughData: t('weight.coach.notEnoughData.title'),
  tooSlow: t('weight.coach.tooSlow.title'),
  onTrack: t('weight.coach.onTrack.title'),
  tooFast: t('weight.coach.tooFast.title'),
}));

const descriptions = computed((): Record<CoachStatus, string> => ({
  notEnoughData: t('weight.coach.notEnoughData.description'),
  tooSlow: t('weight.coach.tooSlow.description'),
  onTrack: t('weight.coach.onTrack.description'),
  tooFast: t('weight.coach.tooFast.description'),
}));

const icons: Record<CoachStatus, string> = {
  notEnoughData: 'i-lucide-hourglass',
  tooSlow: 'i-lucide-battery-low',
  onTrack: 'i-lucide-check',
  tooFast: 'i-lucide-gauge',
};

const badgeClasses: Record<CoachStatus, string> = {
  notEnoughData: 'bg-elevated text-dimmed',
  tooSlow: 'bg-warning/15 text-warning',
  onTrack: 'bg-primary/15 text-primary',
  tooFast: 'bg-warning/15 text-warning',
};

// Signed, so a glance says "gaining" or "losing" without reading the digits.
const rateLabel = computed((): string | undefined => {
  const rate = advice.value.weeklyRateKg;
  if (rate === undefined) return undefined;

  return `${rate >= 0 ? '+' : ''}${rate.toFixed(2)}`;
});
</script>

<template>
  <div class="rise rounded-2xl border border-default bg-elevated/40 p-4 sm:p-5">
    <div class="flex items-start gap-3">
      <span
        class="flex size-10 shrink-0 items-center justify-center rounded-full"
        :class="badgeClasses[advice.status]"
      >
        <UIcon :name="icons[advice.status]" class="size-5" aria-hidden="true" />
      </span>

      <div class="min-w-0">
        <p class="font-semibold">{{ titles[advice.status] }}</p>
        <p class="mt-0.5 text-sm text-muted">
          {{ descriptions[advice.status] }}
        </p>

        <p v-if="rateLabel !== undefined" class="mt-2 text-xs text-dimmed">
          {{ $t('weight.coach.rate') }}
          <span class="tabular-nums">{{ rateLabel }}</span>
          {{ $t('weight.coach.perWeek') }}
        </p>

        <!-- Never applied on its own: the click below is the one explicit
             consent this action ever gets. -->
        <div v-if="canAdjust" class="mt-3">
          <UButton
            size="sm"
            variant="soft"
            :color="justAdjusted ? 'success' : 'primary'"
            :icon="justAdjusted ? 'i-lucide-check' : 'i-lucide-sparkles'"
            :loading="isAdjusting"
            :disabled="justAdjusted"
            @click="applyAdjustment"
          >
            {{
              justAdjusted ? $t('weight.coach.adjustTargetsDone') : $t('weight.coach.adjustTargets')
            }}
          </UButton>

          <p v-if="adjustFailed" class="mt-2 text-xs text-error" role="alert">
            {{ $t('weight.coach.adjustTargetsFailed') }}
          </p>
        </div>

        <p v-else-if="advice.kcalAdjustment !== undefined" class="mt-3 text-xs text-dimmed">
          {{ $t('weight.coach.adjustTargetsNoProfile') }}
        </p>
      </div>
    </div>

    <p class="mt-4 text-xs text-dimmed">{{ $t('weight.coach.disclaimer') }}</p>
  </div>
</template>
