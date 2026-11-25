<script setup lang="ts">
// Something this screen reads could not be fetched. The caller says what, with
// a literal key of its own; the retry is the same everywhere.
const { message } = defineProps<{ message: string }>();

defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-error" role="alert">
    <p>{{ message }}</p>
    <button type="button" class="underline" @click="$emit('retry')">
      {{ $t('order.retry') }}
    </button>
  </div>
</template>
