<script setup lang="ts">
const config = useRuntimeConfig();

// A full page load, not a router navigation: the OAuth dance leaves the app.
const signInWithGoogle = (): void => {
  window.location.href = `${config.public.apiBase}/auth/google`;
};
</script>

<template>
  <section
    class="flex flex-col items-center gap-4 rounded-2xl border border-default bg-elevated/40 px-6 py-12 text-center"
  >
    <UIcon name="i-lucide-user-round" class="size-12 text-dimmed" />
    <h2 class="text-xl font-bold">{{ $t('profile.signedOut.title') }}</h2>
    <p class="max-w-sm text-muted">{{ $t('profile.signedOut.hint') }}</p>

    <UButton
      size="xl"
      icon="i-simple-icons-google"
      class="mt-2 font-semibold text-white"
      @click="signInWithGoogle"
    >
      {{ $t('auth.signInWithGoogle') }}
    </UButton>
  </section>
</template>
