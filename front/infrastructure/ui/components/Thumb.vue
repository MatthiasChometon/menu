<script setup lang="ts">
const {
  src,
  alt,
  icon = 'i-lucide-image',
  rounded = 'rounded-xl',
} = defineProps<{
  src?: string;
  alt: string;
  icon?: string;
  rounded?: string;
}>();

const hasFailed = ref(false);

const showsImage = computed((): boolean => src !== undefined && !hasFailed.value);
</script>

<template>
  <img
    v-if="showsImage"
    :src="src"
    :alt="alt"
    loading="lazy"
    decoding="async"
    :class="rounded"
    class="size-full object-cover"
    @error="hasFailed = true"
  />
  <span
    v-else
    :class="rounded"
    class="flex size-full items-center justify-center bg-elevated text-dimmed"
    role="img"
    :aria-label="alt"
  >
    <UIcon :name="icon" class="size-1/2" />
  </span>
</template>
