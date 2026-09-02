<script setup lang="ts">
const { add, start, pause, reset, remove, timersAt } = useTimers();

const now = ref(Date.now());
useIntervalFn((): void => {
  now.value = Date.now();
}, 1000);

const timers = computed((): TimerView[] => timersAt(now.value));

const label = ref('');
const minutes = ref(10);

const canAdd = computed((): boolean => label.value.trim().length > 0 && minutes.value > 0);

const addTimer = (): void => {
  if (!canAdd.value) return;

  add(label.value.trim(), minutes.value);
  label.value = '';
  minutes.value = 10;
};
</script>

<template>
  <section class="rise">
    <h2 class="text-xl font-bold">{{ $t('batch.timers.title') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('batch.timers.hint') }}</p>

    <form class="mt-4 flex flex-wrap items-end gap-2" @submit.prevent="addTimer">
      <UFormField :label="$t('batch.timers.labelField')" class="min-w-0 flex-1 basis-40">
        <UInput
          v-model="label"
          :placeholder="$t('batch.timers.labelPlaceholder')"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('batch.timers.minutesField')" class="w-24">
        <UInput v-model.number="minutes" type="number" min="1" max="240" class="w-full" />
      </UFormField>
      <UButton type="submit" icon="i-lucide-plus" :disabled="!canAdd">
        {{ $t('batch.timers.add') }}
      </UButton>
    </form>

    <!-- Whether there is anything on the board depends on localStorage, which the
         server cannot read: rendered client-only so the first paint never
         disagrees with what hydrates a moment later. -->
    <ClientOnly>
      <p v-if="timers.length === 0" class="mt-4 text-sm text-dimmed">
        {{ $t('batch.timers.empty') }}
      </p>
      <ul v-else aria-live="polite" class="mt-4 space-y-2">
        <BatchTimerCard
          v-for="timer in timers"
          :key="timer.id"
          :timer="timer"
          @start="start(timer.id)"
          @pause="pause(timer.id)"
          @reset="reset(timer.id)"
          @remove="remove(timer.id)"
        />
      </ul>

      <template #fallback>
        <USkeleton class="mt-4 h-5 w-40" />
      </template>
    </ClientOnly>
  </section>
</template>
