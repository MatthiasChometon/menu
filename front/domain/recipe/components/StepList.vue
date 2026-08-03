<script setup lang="ts">
const { steps } = defineProps<{ steps: string[] }>();

const doneSteps = ref(new Set<number>());
const { isSupported, isActive, request, release } = useWakeLock();

const toggleStep = (index: number): void => {
  const next = new Set(doneSteps.value);
  if (next.has(index)) next.delete(index);
  else next.add(index);
  doneSteps.value = next;
};

const toggleCookMode = async (): Promise<void> => {
  if (isActive.value) await release();
  else await request('screen');
};

onBeforeUnmount((): void => {
  if (isActive.value) void release();
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <!-- Whether the screen can be kept awake is only knowable in the browser,
           so the server has no way to render this button the same way. -->
      <ClientOnly>
        <UButton
          v-if="isSupported"
          :icon="isActive ? 'i-lucide-lightbulb' : 'i-lucide-lightbulb-off'"
          :color="isActive ? 'primary' : 'neutral'"
          :variant="isActive ? 'solid' : 'outline'"
          :aria-pressed="isActive"
          size="sm"
          :class="isActive && 'text-white'"
          @click="toggleCookMode"
        >
          {{ $t('recipe.cookMode') }}
        </UButton>
      </ClientOnly>
      <UButton
        v-if="doneSteps.size > 0"
        icon="i-lucide-rotate-ccw"
        variant="ghost"
        color="neutral"
        size="sm"
        @click="doneSteps = new Set()"
      >
        {{ $t('recipe.resetSteps') }}
      </UButton>
    </div>
    <ClientOnly>
      <p v-if="isSupported && isActive" class="text-xs text-muted">
        {{ $t('recipe.cookModeHint') }}
      </p>
    </ClientOnly>

    <ol class="space-y-2.5">
      <li v-for="(step, index) in steps" :key="step">
        <button
          type="button"
          class="flex w-full items-start gap-3 rounded-2xl border border-default p-3.5 text-left transition-colors"
          :class="doneSteps.has(index) ? 'bg-elevated/60' : 'hover:bg-elevated/40'"
          :aria-pressed="doneSteps.has(index)"
          @click="toggleStep(index)"
        >
          <span
            class="flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors"
            :class="doneSteps.has(index) ? 'bg-primary text-white' : 'bg-elevated text-muted'"
            aria-hidden="true"
          >
            <UIcon v-if="doneSteps.has(index)" name="i-lucide-check" class="size-4" />
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span
            class="min-w-0 flex-1 text-pretty"
            :class="doneSteps.has(index) && 'text-dimmed line-through'"
          >
            {{ step }}
          </span>
        </button>
      </li>
    </ol>
  </div>
</template>
