<script setup lang="ts">
const { open } = useImprovement();
const { user } = useAuth();
const route = useRoute();

// Hidden on the composer, whose own bottom action bar occupies this corner.
const onFocusedPage = computed((): boolean => route.path.replace(/\/$/, '').endsWith('/composer'));
</script>

<template>
  <!-- The green-lightbulb twin of the bug button, sat just above it in the same
       corner: one to report a problem, one to suggest an improvement. Signed-in
       only, because the idea is filed under an account and answered at an
       address — the same rule as the bug button. -->
  <ClientOnly>
    <UiPlainButton
      v-if="user !== undefined && !onFocusedPage"
      square
      color="primary"
      variant="solid"
      size="sm"
      class="fixed bottom-36 right-4 z-30 rounded-full! shadow-lg lg:bottom-20"
      :aria-label="$t('improvement.open')"
      :title="$t('improvement.open')"
      @click="open"
    >
      <UIcon name="i-lucide-lightbulb" class="size-4 shrink-0" />
    </UiPlainButton>
  </ClientOnly>
</template>
