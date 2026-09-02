<script setup lang="ts">
const { glasses, targetGlasses, maxGlasses, liters, hasReachedTarget } = defineProps<{
  glasses: number;
  targetGlasses: number;
  maxGlasses: number;
  liters: number;
  hasReachedTarget: boolean;
}>();

defineEmits<{ toggleGlass: [index: number] }>();

const { t, locale } = useNuxtApp().$i18n;

const glassIndexes = computed((): number[] =>
  Array.from({ length: maxGlasses }, (_, index): number => index),
);

// "L" is a unit symbol, not a translatable word (unlike kcal/g elsewhere,
// which come from the menu translation): it stays identical in both locales,
// so it is baked into the number rather than raced as its own text node.
const litersLabel = computed(
  (): string =>
    `${liters.toLocaleString(locale.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`,
);

const percent = computed((): number => Math.min(100, (glasses / maxGlasses) * 100));

const glassLabelOf = (index: number): string => `${t('today.hydration.glass')} ${index + 1}`;

// The target sits inside the grid rather than after it: it is the glass that
// completes the minimum, not a separate number to cross-reference.
const isTargetGlass = (index: number): boolean => index === targetGlasses - 1;
</script>

<template>
  <UCard class="rise">
    <div class="flex items-center justify-between gap-2">
      <h2 class="flex items-center gap-2 font-bold">
        <UIcon name="i-lucide-glass-water" class="size-5 text-primary" />
        {{ $t('today.hydration.title') }}
      </h2>
      <UBadge v-if="hasReachedTarget" color="primary" variant="subtle" size="sm">
        {{ $t('today.hydration.reached') }}
      </UBadge>
    </div>

    <p class="mt-1 flex items-baseline gap-2">
      <span class="font-bold tabular-nums">{{ litersLabel }}</span>
      <span class="text-sm text-dimmed">{{ $t('today.hydration.target') }}</span>
    </p>

    <div class="mt-3 h-2 overflow-hidden rounded-full bg-elevated">
      <div
        class="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
        :style="{ width: `${percent}%` }"
      />
    </div>

    <div class="mt-4 flex flex-wrap gap-2" role="group" :aria-label="$t('today.hydration.title')">
      <button
        v-for="index in glassIndexes"
        :key="index"
        type="button"
        class="relative flex size-10 items-center justify-center rounded-full transition-colors"
        :class="[
          index < glasses
            ? 'bg-primary text-white'
            : 'bg-elevated text-dimmed hover:bg-elevated/70',
          isTargetGlass(index) && 'ring-2 ring-primary/40 ring-offset-2 ring-offset-default',
        ]"
        :aria-pressed="index < glasses"
        :aria-label="glassLabelOf(index)"
        @click="$emit('toggleGlass', index)"
      >
        <UIcon name="i-lucide-glass-water" class="size-4" />
      </button>
    </div>
  </UCard>
</template>
