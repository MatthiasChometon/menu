<script setup lang="ts">
const { timer } = defineProps<{ timer: TimerView }>();

defineEmits<{ start: []; pause: []; reset: []; remove: [] }>();

const { play } = useTimerChime();

const isDone = computed((): boolean => timer.status === 'done');
const isRunning = computed((): boolean => timer.status === 'running');

const clock = computed((): string => {
  const minutes = Math.floor(timer.remainingSeconds / 60);
  const seconds = timer.remainingSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
});
</script>

<template>
  <li
    class="rise flex items-center gap-3 rounded-2xl border p-3 transition-colors"
    :class="
      isDone
        ? 'reduced-motion-solid animate-[timer-alert_1.1s_ease-in-out_infinite] border-warning bg-warning/10'
        : 'border-default'
    "
  >
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-semibold">{{ timer.label }}</p>
      <p
        class="font-sans text-3xl font-bold tabular-nums"
        :class="isDone ? 'text-warning' : isRunning ? 'text-primary' : 'text-default'"
      >
        {{ clock }}
      </p>
      <p v-if="isDone" class="mt-0.5 flex items-center gap-1 text-xs font-semibold text-warning">
        <UIcon name="i-lucide-bell-ring" class="size-3.5 shrink-0" aria-hidden="true" />
        {{ $t('batch.timers.done') }}
      </p>
    </div>

    <div class="flex shrink-0 flex-col gap-1.5">
      <div class="flex gap-1.5">
        <UButton
          v-if="isDone"
          icon="i-lucide-volume-2"
          color="warning"
          variant="soft"
          size="sm"
          :aria-label="$t('batch.timers.playSound')"
          @click="play"
        />
        <UButton
          v-else-if="isRunning"
          icon="i-lucide-pause"
          color="primary"
          variant="soft"
          size="sm"
          :aria-label="$t('batch.timers.pause')"
          @click="$emit('pause')"
        />
        <UButton
          v-else
          icon="i-lucide-play"
          color="primary"
          size="sm"
          :aria-label="$t('batch.timers.start')"
          @click="$emit('start')"
        />
        <UButton
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="$t('batch.timers.reset')"
          @click="$emit('reset')"
        />
      </div>
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="sm"
        :aria-label="$t('batch.timers.remove')"
        @click="$emit('remove')"
      />
    </div>
  </li>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  @keyframes timer-alert {
    0%,
    100% {
      background-color: color-mix(in oklab, var(--ui-warning) 10%, transparent);
    }
    50% {
      background-color: color-mix(in oklab, var(--ui-warning) 22%, transparent);
    }
  }
}

/* Reduced motion still needs a clear, static alert — colour, icon and text
   carry it instead of the pulse. */
@media (prefers-reduced-motion: reduce) {
  .reduced-motion-solid {
    animation: none !important;
  }
}
</style>
