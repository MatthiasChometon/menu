<script setup lang="ts">
import type { PlainButtonColor, PlainButtonSize, PlainButtonVariant } from '../plainButton';
import { plainButtonClasses } from '../plainButton';

// A button that looks like Nuxt UI's `UButton` (same classes, checked against its theme) without
// its per-instance cost, and without pulling the button theme and tailwind-merge into the entry
// chunk. It has no loading state and no leading-icon prop: put a `UIcon` in the slot, and use
// `UButton` where a loading state is needed. With `to` it is a link (`NuxtLink`), otherwise a
// `button` whose `type` defaults to "button". Every other attribute falls through. `color`
// defaults to primary for solid/soft/outline; `block` makes it full width.
const {
  variant = 'ghost',
  size = 'md',
  square = false,
  block = false,
  type = 'button',
  color = undefined,
  to = undefined,
} = defineProps<{
  variant?: PlainButtonVariant;
  size?: PlainButtonSize;
  square?: boolean;
  block?: boolean;
  type?: 'button' | 'submit' | 'reset';
  color?: PlainButtonColor;
  to?: string;
}>();
</script>

<template>
  <NuxtLink
    v-if="to !== undefined"
    :to="to"
    :class="plainButtonClasses(variant, size, square, color, block)"
  >
    <slot />
  </NuxtLink>
  <button v-else :type="type" :class="plainButtonClasses(variant, size, square, color, block)">
    <slot />
  </button>
</template>
