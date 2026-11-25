<script setup lang="ts">
// What a signed-out visitor sees where an account is needed: email first (the
// one that works without a Google account), Google as the shortcut when the
// back has it configured. The page says what it is for; this says how to get in.
const { icon, title, hint, unavailable } = defineProps<{
  icon: string;
  title: string;
  hint: string;
  /** Shown instead of the options when no API is configured. */
  unavailable: string;
}>();

const config = useRuntimeConfig();
const { googleSignInUrl } = useGoogleSignIn();

// No API configured means no account to sign into. Offering the button anyway
// would send the reader to whatever host the setting happens to hold — and a
// guessed hostname belongs to whoever claimed it first.
const apiBase = computed((): string => config.public.apiBase.trim());
const canSignIn = computed((): boolean => apiBase.value.length > 0);

// Whether the back has Google OAuth configured. Hidden when it is not (a fresh
// dev checkout has no OAuth app), so nobody clicks a button that can only fail.
// server: false because the site is prerendered; default false so a broken
// button never flashes.
const { data: google } = useAsyncData(
  'google-enabled',
  (): Promise<{ googleEnabled: boolean }> => GqlGoogleEnabled(),
  { server: false, default: (): { googleEnabled: boolean } => ({ googleEnabled: false }) },
);

// A full page load, not a router navigation: the OAuth dance leaves the app.
const signInWithGoogle = (): void => {
  const target = googleSignInUrl.value;
  if (target === undefined) return;
  window.location.href = target;
};
</script>

<template>
  <section
    class="flex flex-col items-center gap-4 rounded-2xl border border-default bg-elevated/40 px-6 py-12 text-center"
  >
    <UIcon :name="icon" class="size-12 text-dimmed" />
    <h2 class="text-xl font-bold">{{ title }}</h2>
    <p class="max-w-sm text-muted">{{ hint }}</p>

    <template v-if="canSignIn">
      <AuthEmailForm class="mt-2" />

      <template v-if="google.googleEnabled">
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

    <p v-else class="mt-2 max-w-sm text-sm text-dimmed">{{ unavailable }}</p>
  </section>
</template>
