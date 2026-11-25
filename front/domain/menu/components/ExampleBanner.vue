<script setup lang="ts">
const localePath = useLocalePath();
const isMounted = useMounted();
const { isDismissed: isOnboardingDismissed } = useOnboardingStatus();
</script>

<template>
  <!-- Nobody signed in: this is the shop window. A real week, fully weighed,
       under a line that says it is an example and a button to make it real. -->
  <div
    class="rise mb-6 overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6"
  >
    <UBadge color="primary" variant="subtle" size="sm" class="mb-2">
      {{ $t('menu.example.badge') }}
    </UBadge>
    <h1 class="font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl">
      {{ $t('menu.example.title') }}
    </h1>
    <p class="mt-2 max-w-xl text-muted">{{ $t('menu.example.lead') }}</p>
    <div class="mt-4 flex flex-wrap items-center gap-3">
      <UButton
        :to="localePath('/composer')"
        color="primary"
        size="xl"
        icon="i-lucide-square-pen"
        class="font-semibold text-white"
      >
        {{ $t('menu.example.cta') }}
      </UButton>
      <!-- Proposed, never imposed: a first-time visitor sees it once, and
           it never reappears once the walkthrough has been offered — the
           page itself still works with no account and no answers. -->
      <UButton
        v-if="isMounted && !isOnboardingDismissed"
        :to="localePath('/bienvenue')"
        variant="ghost"
        color="neutral"
        icon="i-lucide-compass"
      >
        {{ $t('menu.example.discover') }}
      </UButton>
    </div>
  </div>
</template>
