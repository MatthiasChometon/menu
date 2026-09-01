<script setup lang="ts">
const { steps, quantities = [], showWakeLockToggle = true } = defineProps<{
  steps: string[];
  quantities?: FoodQuantity[];
  /** Off inside kitchen mode: that screen already holds one lock for every
   *  dish, and a second toggle per card would only invite confusion. */
  showWakeLockToggle?: boolean;
}>();

const { segmentsOf } = useRecipeSteps();
const { quantityLabel } = useFoodFormat();
const { seasoningOf } = useSeasonings();

const doneSteps = ref(new Set<number>());
const { isSupported, isActive, request, release } = useWakeLock();

// Looked up per mention rather than passed down: the same ingredient can appear
// in several steps, and the amount always follows the portion currently chosen.
const byFood = computed(
  (): Map<string, FoodQuantity> =>
    new Map(quantities.map((quantity): [string, FoodQuantity] => [quantity.food.id, quantity])),
);

// Parenthesised here rather than in the template: the brackets are punctuation,
// not translatable copy, and the linter rightly refuses raw text in the markup.
const amountOf = (foodId: string): string | undefined => {
  const quantity = byFood.value.get(foodId);
  return quantity === undefined ? undefined : `(${quantityLabel(quantity.food, quantity.grams)})`;
};

// Seasonings share the ingredients' markup but never a weight, so they get their
// own quieter treatment: highlighted enough to be spotted while shopping the
// cupboard, never loud enough to be mistaken for something to weigh out.
const isSeasoning = (id: string): boolean => seasoningOf(id) !== undefined;

const isDone = (index: number): boolean => doneSteps.value.has(index);

const allDone = computed((): boolean => steps.length > 0 && doneSteps.value.size === steps.length);

const progress = computed((): number =>
  steps.length === 0 ? 0 : (doneSteps.value.size / steps.length) * 100,
);

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
          v-if="isSupported && showWakeLockToggle"
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
      <p v-if="isSupported && isActive && showWakeLockToggle" class="text-xs text-muted">
        {{ $t('recipe.cookModeHint') }}
      </p>
    </ClientOnly>

    <!-- The invitation to tick has to be explicit: nothing about a paragraph of
         text says it can be tapped, and the counter gives the tap a purpose. -->
    <div class="space-y-2">
      <div class="flex items-center justify-between gap-3 text-sm">
        <p class="flex items-center gap-1.5 text-muted">
          <UIcon name="i-lucide-pointer" class="size-4 shrink-0" aria-hidden="true" />
          <span>{{ allDone ? $t('recipe.allStepsDone') : $t('recipe.stepsHint') }}</span>
        </p>
        <p
          class="shrink-0 font-semibold tabular-nums"
          :class="allDone ? 'text-primary' : 'text-muted'"
        >
          {{ doneSteps.size }} / {{ steps.length }}
        </p>
      </div>
      <div class="h-1.5 overflow-hidden rounded-full bg-elevated" aria-hidden="true">
        <div
          class="h-full rounded-full bg-primary transition-[width] duration-300"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <ol class="space-y-2.5">
      <li v-for="(step, index) in steps" :key="step">
        <button
          type="button"
          role="checkbox"
          class="group flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors"
          :class="
            isDone(index)
              ? 'border-primary/40 bg-primary/5'
              : 'border-default hover:border-primary/50 hover:bg-elevated/50'
          "
          :aria-checked="isDone(index)"
          @click="toggleStep(index)"
        >
          <span
            class="flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors"
            :class="isDone(index) ? 'bg-primary/15 text-primary' : 'bg-elevated text-muted'"
            aria-hidden="true"
          >
            {{ index + 1 }}
          </span>

          <span
            class="min-w-0 flex-1 text-pretty leading-relaxed"
            :class="isDone(index) && 'text-dimmed'"
          >
            <template v-for="(segment, part) in segmentsOf(step)" :key="part">
              <!-- The ingredient and its weight read as one block, so the eye
                   never has to travel back up to the ingredient list. The negative
                   margin cancels the padding: the highlight still bleeds around the
                   words, but the comma that follows keeps hugging them. -->
              <span
                v-if="segment.foodId !== undefined"
                class="-mx-1 inline rounded-md px-1 py-0.5 decoration-clone transition-colors"
                :class="[
                  isSeasoning(segment.foodId) ? 'font-medium' : 'font-semibold',
                  isDone(index)
                    ? 'bg-elevated text-dimmed'
                    : isSeasoning(segment.foodId)
                      ? 'bg-elevated text-toned'
                      : 'bg-primary/10 text-highlighted',
                ]"
              >
                {{ segment.text
                }}<span
                  v-if="amountOf(segment.foodId) !== undefined"
                  class="ms-1 whitespace-nowrap text-sm font-bold tabular-nums"
                  :class="isDone(index) ? 'text-dimmed' : 'text-primary'"
                  >{{ amountOf(segment.foodId) }}</span
                >
              </span>
              <template v-else>{{ segment.text }}</template>
            </template>
          </span>

          <span
            class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors"
            :class="
              isDone(index)
                ? 'border-primary bg-primary text-white'
                : 'border-muted group-hover:border-primary'
            "
            aria-hidden="true"
          >
            <UIcon v-if="isDone(index)" name="i-lucide-check" class="size-3.5" />
          </span>
        </button>
      </li>
    </ol>
  </div>
</template>
