<script setup lang="ts">
import type { PlainBadgeColor } from '../plainBadge';
import { plainBadgeClasses } from '../plainBadge';

// A `subtle` small badge that looks like Nuxt UI's `UBadge` (same classes, checked against its theme)
// without its per-instance cost: a list of meals draws a lot of them.
const { color = 'neutral' } = defineProps<{ color?: PlainBadgeColor }>();
</script>

<template>
  <span :class="plainBadgeClasses(color)"><slot /></span>
</template>
