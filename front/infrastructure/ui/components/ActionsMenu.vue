<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

const { items, label } = defineProps<{
  items: DropdownMenuItem[] | DropdownMenuItem[][];
  label: string;
}>();

// A plain button until the first touch: the dropdown and popper code (about
// 25 KB compressed) is fetched when someone reaches for the menu, not with every
// page that shows a row of them. Pointing at it warms the chunk up, so the menu
// opens without waiting on a tap.
const armed = ref(false);
const openOnMount = ref(false);

const arm = (): void => {
  armed.value = true;
};

const openNow = (): void => {
  openOnMount.value = true;
  arm();
};
</script>

<template>
  <LazyUDropdownMenu v-if="armed" :items="items" :default-open="openOnMount">
    <UButton
      icon="i-lucide-ellipsis-vertical"
      color="neutral"
      variant="ghost"
      size="sm"
      class="shrink-0"
      :aria-label="label"
    />
  </LazyUDropdownMenu>
  <UiPlainButton
    v-else
    color="neutral"
    variant="ghost"
    size="sm"
    square
    class="shrink-0"
    :aria-label="label"
    @pointerenter="arm"
    @click="openNow"
  >
    <UIcon name="i-lucide-ellipsis-vertical" class="size-4 shrink-0" />
  </UiPlainButton>
</template>
