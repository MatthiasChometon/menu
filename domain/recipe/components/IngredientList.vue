<script setup lang="ts">
const { quantities } = defineProps<{ quantities: FoodQuantity[] }>();

const { imageOf } = useFoods();
const { nameOf, quantityLabel, pieceCount } = useFoodFormat();
</script>

<template>
  <ul class="grid gap-2 sm:grid-cols-2">
    <li
      v-for="{ food, grams } in quantities"
      :key="food.id"
      class="flex items-center gap-3 rounded-2xl border border-default bg-elevated/30 p-2.5"
    >
      <div class="size-12 shrink-0 overflow-hidden rounded-lg">
        <UiThumb :src="imageOf(food)" :alt="nameOf(food)" :icon="food.icon" rounded="rounded-lg" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium">{{ nameOf(food) }}</p>
        <p v-if="pieceCount(food, grams) !== undefined" class="text-xs text-muted">
          ≈ {{ pieceCount(food, grams) }}
        </p>
      </div>
      <span class="shrink-0 font-bold tabular-nums">{{ quantityLabel(food, grams) }}</span>
    </li>
  </ul>
</template>
