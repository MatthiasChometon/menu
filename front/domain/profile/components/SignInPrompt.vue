<script setup lang="ts">
const config = useRuntimeConfig();

// No API configured means no account to sign into. Offering the button anyway
// would send the reader to whatever host the setting happens to hold — and a
// guessed hostname belongs to whoever claimed it first.
const apiBase = computed((): string => String(config.public.apiBase ?? '').trim());
const canSignIn = computed((): boolean => apiBase.value.length > 0);

// A full page load, not a router navigation: the OAuth dance leaves the app.
const signInWithGoogle = (): void => {
  if (!canSignIn.value) return;
  window.location.href = `${apiBase.value}/auth/google`;
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
      v-if="canSignIn"
      size="xl"
      icon="i-simple-icons-google"
      class="mt-2 font-semibold text-white"
      @click="signInWithGoogle"
    >
      {{ $t('auth.signInWithGoogle') }}
    </UButton>

    <p v-else class="mt-2 max-w-sm text-sm text-dimmed">
      {{ $t('profile.signedOut.unavailable') }}
    </p>
  </section>
</template>
