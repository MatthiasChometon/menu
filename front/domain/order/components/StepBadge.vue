<script setup lang="ts">
const { step, state } = defineProps<{
  step: number;
  state: 'done' | 'active' | 'locked';
}>();
</script>

<template>
  <span
    class="flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold"
    :class="{
      'bg-success text-white': state === 'done',
      'bg-primary text-white': state === 'active',
      'bg-elevated text-dimmed': state === 'locked',
    }"
    aria-hidden="true"
  >
    <UIcon v-if="state === 'done'" name="i-lucide-check" class="size-4" />
    <UIcon v-else-if="state === 'locked'" name="i-lucide-lock" class="size-3.5" />
    <template v-else>{{ step }}</template>
  </span>
</template>
