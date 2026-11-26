<script setup lang="ts">
const {
  src,
  alt,
  icon = 'i-lucide-image',
  rounded = 'rounded-xl',
  eager = false,
} = defineProps<{
  src?: string;
  alt: string;
  icon?: string;
  rounded?: string;
  /** An image in the first screenful: fetched at once and first, never waiting to scroll near. */
  eager?: boolean;
}>();

const hasFailed = ref(false);

// A photograph that is not in the first screenful is not asked for until it is
// about to scroll into view. The browser's own lazy loading looks a couple of
// screens ahead on a slow connection, which put nine photographs on the wire
// beside the one the page is measured on.
const NEAR_MARGIN = '200px';
const holder = ref<HTMLElement | null>(null);
const isNear = ref(eager);
const { stop } = useIntersectionObserver(
  holder,
  ([entry]): void => {
    if (entry?.isIntersecting !== true) return;
    isNear.value = true;
    stop();
  },
  { rootMargin: NEAR_MARGIN },
);

const showsImage = computed((): boolean => src !== undefined && !hasFailed.value);
const isFetched = computed((): boolean => showsImage.value && isNear.value);
</script>

<template>
  <img
    v-if="isFetched"
    ref="holder"
    :src="src"
    :alt="alt"
    :loading="eager ? 'eager' : 'lazy'"
    :fetchpriority="eager ? 'high' : undefined"
    decoding="async"
    :class="rounded"
    class="size-full overflow-hidden object-cover"
    @error="hasFailed = true"
  />
  <span
    v-else
    ref="holder"
    :class="rounded"
    class="flex size-full items-center justify-center bg-elevated text-dimmed"
    role="img"
    :aria-label="alt"
  >
    <UIcon :name="icon" class="size-1/2" />
  </span>
</template>
