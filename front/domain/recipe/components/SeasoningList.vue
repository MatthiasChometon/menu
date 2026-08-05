<script setup lang="ts">
const { seasonings } = defineProps<{ seasonings: Seasoning[] }>();

const { nameOf } = useFoodFormat();
</script>

<template>
  <ul class="flex flex-wrap gap-2">
    <li
      v-for="seasoning in seasonings"
      :key="seasoning.id"
      class="flex items-center gap-2 rounded-full border border-default bg-elevated/30 py-1.5 pl-3 pr-4"
    >
      <UIcon :name="seasoning.icon" class="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span class="text-sm font-medium">{{ nameOf(seasoning) }}</span>
      <span v-if="seasoning.fresh" class="text-xs text-muted">{{
        $t('recipe.freshSeasoning')
      }}</span>
    </li>
  </ul>
</template>
