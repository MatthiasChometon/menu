<script setup lang="ts">
defineEmits<{ addFirst: [] }>();
</script>

<template>
  <div class="rise rounded-2xl border border-dashed border-default p-8 text-center">
    <UIcon name="i-lucide-scale" class="mx-auto size-10 text-dimmed" aria-hidden="true" />
    <h2 class="mt-4 text-lg font-semibold">{{ $t('weight.empty.title') }}</h2>
    <p class="mx-auto mt-1 max-w-sm text-sm text-muted">{{ $t('weight.empty.hint') }}</p>
    <UButton class="mt-5 font-semibold text-white" icon="i-lucide-plus" @click="$emit('addFirst')">
      {{ $t('weight.empty.cta') }}
    </UButton>
  </div>
</template>
