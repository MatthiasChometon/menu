<script setup lang="ts">
const config = useRuntimeConfig();

// No API configured means no account to sign into. Offering the button anyway
// would send the reader to whatever host the setting happens to hold — and a
// guessed hostname belongs to whoever claimed it first.
const apiBase = computed((): string => String(config.public.apiBase ?? '').trim());
const canSignIn = computed((): boolean => apiBase.value.length > 0);

// Whether the back has Google OAuth configured. The button and its divider are
// hidden when it is not (a fresh dev checkout has no OAuth app), so nobody
// clicks one that can only fail — email/password still works. server: false
// because the site is prerendered; default false so a broken button never flashes.
const { data: google } = useAsyncData('google-enabled', (): Promise<{ googleEnabled: boolean }> => GqlGoogleEnabled(), {
  server: false,
  default: (): { googleEnabled: boolean } => ({ googleEnabled: false }),
});
const googleEnabled = computed((): boolean => google.value?.googleEnabled ?? false);

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

    <template v-if="canSignIn">
      <!-- Email first: it is the one that works for somebody without a Google
           account, and the one that has to be confirmed before it opens
           anything. Google stays as the shortcut for whoever has one. -->
      <AuthEmailForm class="mt-2" />

      <!-- Google appears only when the back has it configured (a fresh dev
           checkout has no OAuth app): never a button, nor a divider leading to
           one, that can only fail. -->
      <template v-if="googleEnabled">
        <div class="flex w-full max-w-sm items-center gap-3 text-xs text-dimmed">
          <span class="h-px flex-1 bg-default" />
          <span>{{ $t('auth.orContinueWith') }}</span>
          <span class="h-px flex-1 bg-default" />
        </div>

        <UButton
          size="xl"
          variant="subtle"
          icon="i-simple-icons-google"
          class="font-semibold"
          @click="signInWithGoogle"
        >
          {{ $t('auth.signInWithGoogle') }}
        </UButton>
      </template>
    </template>

    <p v-else class="mt-2 max-w-sm text-sm text-dimmed">
      {{ $t('profile.signedOut.unavailable') }}
    </p>
  </section>
</template>
