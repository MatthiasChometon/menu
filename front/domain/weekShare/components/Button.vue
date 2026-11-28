<script setup lang="ts">
const { open } = useWeekShare();
const { selectedMenu: menu } = useSelectedWeek();
const route = useRoute();

// The composer has its own bottom action bar; step aside there, same as the
// other floating buttons. Stacked one slot above the bug report and
// improvement request buttons so none of the three ever overlap.
const onFocusedPage = computed((): boolean => route.path.replace(/\/$/, '').endsWith('/composer'));
</script>

<template>
  <ClientOnly>
    <UiPlainButton
      v-if="menu !== undefined && !onFocusedPage"
      square
      color="primary"
      variant="solid"
      size="sm"
      class="fixed bottom-52 right-4 z-30 rounded-full! text-white shadow-lg sm:bottom-32"
      :aria-label="$t('weekShare.open')"
      :title="$t('weekShare.open')"
      @click="open"
    >
      <UIcon name="i-lucide-share-2" class="size-4 shrink-0" />
    </UiPlainButton>
  </ClientOnly>
</template>
