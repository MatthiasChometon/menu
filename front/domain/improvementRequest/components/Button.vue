<script setup lang="ts">
const { open } = useImprovement();
const { user } = useAuth();
</script>

<template>
  <!-- The green-lightbulb twin of the bug button, sat just above it in the same
       corner: one to report a problem, one to suggest an improvement. Signed-in
       only, because the idea is filed under an account and answered at an
       address — the same rule as the bug button. -->
  <ClientOnly>
    <UButton
      v-if="user !== undefined"
      icon="i-lucide-lightbulb"
      color="primary"
      variant="solid"
      size="sm"
      class="fixed bottom-36 right-4 z-30 rounded-full shadow-lg sm:bottom-20"
      :aria-label="$t('improvement.open')"
      :title="$t('improvement.open')"
      @click="open"
    />
  </ClientOnly>
</template>
