<script setup lang="ts">
const { user } = useAuth();
const { isGenerating, hasFailed, generate } = useGenerateFirstWeek();
</script>

<template>
  <section class="flex flex-col items-center gap-4 py-6 text-center">
    <span class="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
      <UIcon name="i-lucide-calendar-plus" class="size-8 text-primary" aria-hidden="true" />
    </span>
    <h1 class="font-serif text-3xl tracking-tight sm:text-4xl">
      {{ $t('onboarding.generate.title') }}
    </h1>
    <p class="max-w-sm text-muted">{{ $t('onboarding.generate.lead') }}</p>

    <UButton
      size="xl"
      icon="i-lucide-sparkles"
      class="mt-2 font-semibold text-white"
      :loading="isGenerating"
      :disabled="isGenerating"
      @click="generate"
    >
      {{ isGenerating ? $t('planner.generate.working') : $t('onboarding.generate.action') }}
    </UButton>

    <p v-if="user === undefined" class="max-w-sm text-sm text-muted">
      {{ $t('onboarding.generate.signedOutHint') }}
    </p>

    <UAlert
      v-if="hasFailed"
      class="mt-2 w-full"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="$t('onboarding.generate.error')"
    />
  </section>
</template>
