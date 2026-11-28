<script setup lang="ts">
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <!-- The week could not be fetched: say so and offer the retry, rather than pass
       it off as an empty week and send the reader to compose another. -->
  <LazyUAlert
    hydrate-on-idle
    role="alert"
    color="error"
    variant="subtle"
    icon="i-lucide-circle-alert"
    :title="$t('menu.loadFailed.title')"
    :description="$t('menu.loadFailed.hint')"
    :actions="[
      {
        label: $t('menu.loadFailed.retry'),
        color: 'error',
        variant: 'outline',
        onClick: (): void => emit('retry'),
      },
    ]"
  />
</template>
