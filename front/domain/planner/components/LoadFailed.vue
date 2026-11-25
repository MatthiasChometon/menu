<script setup lang="ts">
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <!-- A read that failed is not an empty week: it gets an alert of its own, and a
       retry, outside the polite status region of the save line. -->
  <div class="mt-2 flex flex-wrap items-center gap-2" role="alert">
    <p class="text-sm text-error">{{ $t('planner.saving.loadFailed') }}</p>
    <UButton size="xs" variant="outline" @click="emit('retry')">
      {{ $t('planner.saving.loadRetry') }}
    </UButton>
  </div>
</template>
