<script setup lang="ts">
const { line, picked = false } = defineProps<{
  line: ShoppingLine;
  picked?: boolean;
}>();

const emit = defineEmits<{ toggle: [] }>();

const { imageOf } = useFoods();
const { nameOf, quantityLabel, pieceLabel } = useFoodFormat();
</script>

<template>
  <li>
    <button
      type="button"
      class="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200"
      :class="
        picked
          ? 'border-transparent bg-elevated/40 opacity-55'
          : 'border-default hover:border-primary/40 hover:bg-elevated/30'
      "
      :aria-pressed="picked"
      @click="emit('toggle')"
    >
      <span
        class="flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors"
        :class="picked ? 'border-primary bg-primary text-white' : 'border-muted'"
        aria-hidden="true"
      >
        <UIcon v-if="picked" name="i-lucide-check" class="size-4" />
      </span>

      <div class="size-11 shrink-0 overflow-hidden rounded-lg">
        <UiThumb
          :src="imageOf(line.food)"
          :alt="nameOf(line.food)"
          :icon="line.food.icon"
          rounded="rounded-lg"
        />
      </div>

      <div class="min-w-0 flex-1">
        <p class="truncate font-medium" :class="picked && 'line-through'">
          {{ nameOf(line.food) }}
        </p>
        <p v-if="pieceLabel(line.food, line.grams) !== undefined" class="text-xs text-muted">
          ≈ {{ pieceLabel(line.food, line.grams) }}
        </p>
      </div>

      <div class="shrink-0 text-right">
        <p class="font-bold tabular-nums">{{ quantityLabel(line.food, line.grams) }}</p>
        <p class="text-xs tabular-nums text-dimmed">~{{ line.price.toFixed(2) }} €</p>
      </div>
    </button>
  </li>
</template>
