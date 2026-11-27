<script setup lang="ts">
import {
  localSourceOf,
  THUMB_SIZES,
  type LocalImages,
  type LocalSource,
} from '../../images/utils/localImages';

// The class of the caller (a hover transform, say) belongs to the image, not to its <picture>.
defineOptions({ inheritAttrs: false });

const {
  src,
  alt,
  icon = 'i-lucide-image',
  rounded = 'rounded-xl',
  eager = false,
  sizes = THUMB_SIZES,
} = defineProps<{
  src?: string;
  alt: string;
  icon?: string;
  rounded?: string;
  /** An image in the first screenful: fetched at once and first, never waiting to scroll near. */
  eager?: boolean;
  /** The width the picture is drawn at, for the browser to pick the file from its srcset. */
  sizes?: string;
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

// A photograph the site serves itself comes in AVIF and WebP, in several widths.
const local = computed((): LocalSource | undefined =>
  localSourceOf(src, useRuntimeConfig().public.localImages as LocalImages),
);

const showsImage = computed((): boolean => src !== undefined && !hasFailed.value);
const isFetched = computed((): boolean => showsImage.value && isNear.value);
</script>

<template>
  <picture v-if="isFetched && local !== undefined" class="contents">
    <source type="image/avif" :srcset="local.avifSrcset" :sizes="sizes" />
    <source type="image/webp" :srcset="local.webpSrcset" :sizes="sizes" />
    <img
      ref="holder"
      :src="local.fallback"
      :width="local.width"
      :height="local.height"
      :alt="alt"
      :loading="eager ? 'eager' : 'lazy'"
      :fetchpriority="eager ? 'high' : undefined"
      decoding="async"
      :class="rounded"
      v-bind="$attrs"
      class="size-full overflow-hidden object-cover"
      @error="hasFailed = true"
    />
  </picture>
  <img
    v-else-if="isFetched"
    ref="holder"
    :src="src"
    :alt="alt"
    :loading="eager ? 'eager' : 'lazy'"
    :fetchpriority="eager ? 'high' : undefined"
    decoding="async"
    :class="rounded"
    v-bind="$attrs"
    class="size-full overflow-hidden object-cover"
    @error="hasFailed = true"
  />
  <span
    v-else
    ref="holder"
    :class="rounded"
    class="flex size-full items-center justify-center bg-elevated text-dimmed"
    v-bind="$attrs"
    role="img"
    :aria-label="alt"
  >
    <UIcon :name="icon" class="size-1/2" />
  </span>
</template>
