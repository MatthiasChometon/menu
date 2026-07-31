<script setup lang="ts">
const {
  group,
  pickedIds,
  index = 0,
} = defineProps<{
  group: ShoppingGroup;
  pickedIds: string[];
  index?: number;
}>();

const emit = defineEmits<{ toggle: [foodId: string] }>();

const pickedCount = computed(
  (): number => group.lines.filter((line): boolean => pickedIds.includes(line.food.id)).length,
);
</script>

<template>
  <section class="rise" :style="{ animationDelay: `${Math.min(index, 6) * 70}ms` }">
    <div class="mb-2 flex items-baseline justify-between gap-3 px-1">
      <h2 class="font-bold">{{ $t(`shopping.aisle.${group.aisle}`) }}</h2>
      <span class="text-sm tabular-nums text-muted">
        {{ pickedCount }} / {{ group.lines.length }}
      </span>
    </div>
    <ul class="space-y-2">
      <ShoppingItem
        v-for="line in group.lines"
        :key="line.food.id"
        :line="line"
        :picked="pickedIds.includes(line.food.id)"
        @toggle="emit('toggle', line.food.id)"
      />
    </ul>
  </section>
</template>
