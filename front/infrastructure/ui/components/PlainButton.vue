<script setup lang="ts">
import type { PlainButtonColor, PlainButtonSize, PlainButtonVariant } from '../plainButton';
import { plainButtonClasses } from '../plainButton';

// A button that looks like Nuxt UI's `UButton` (same classes, checked against its theme) without
// its per-instance cost. It has no loading state, no link mode and no leading-icon prop: put a
// `UIcon` in the slot, and use `UButton` where a loading state or a link is needed. `type` defaults
// to "button"; every other attribute falls through. `color` defaults to primary for solid/soft.
const {
  variant = 'ghost',
  size = 'md',
  square = false,
  type = 'button',
  color = undefined,
} = defineProps<{
  variant?: PlainButtonVariant;
  size?: PlainButtonSize;
  square?: boolean;
  type?: 'button' | 'submit' | 'reset';
  color?: PlainButtonColor;
}>();
</script>

<template>
  <button :type="type" :class="plainButtonClasses(variant, size, square, color)">
    <slot />
  </button>
</template>
