<script setup lang="ts">
const isOnline = useOnline();
</script>

<template>
  <p
    role="status"
    class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
    :class="
      isOnline ? 'border-default text-dimmed' : 'border-warning/40 bg-warning/10 text-warning'
    "
  >
    <UIcon
      :name="isOnline ? 'i-lucide-wifi' : 'i-lucide-wifi-off'"
      class="size-3.5 shrink-0"
      aria-hidden="true"
    />
    {{ isOnline ? $t('shopping.online.online') : $t('shopping.online.offline') }}
  </p>
</template>
