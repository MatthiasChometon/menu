<script setup lang="ts">
const config = useRuntimeConfig();

// No API configured means no account to sign into. Offering the button anyway
// would send the reader to whatever host the setting happens to hold — and a
// guessed hostname belongs to whoever claimed it first.
const apiBase = computed((): string => String(config.public.apiBase ?? '').trim());
const canSignIn = computed((): boolean => apiBase.value.length > 0);

// Whether the back has Google OAuth configured. server: false because the site
// is prerendered; default false so a broken button never flashes.
const { data: google } = useAsyncData(
  'google-enabled',
  (): Promise<{ googleEnabled: boolean }> => GqlGoogleEnabled(),
  { server: false, default: (): { googleEnabled: boolean } => ({ googleEnabled: false }) },
);
const googleEnabled = computed((): boolean => google.value?.googleEnabled ?? false);

const signInWithGoogle = (): void => {
  if (!canSignIn.value) return;
  window.location.href = `${apiBase.value}/auth/google`;
};
</script>

<template>
  <section
    class="flex flex-col items-center gap-4 rounded-2xl border border-default bg-elevated/40 px-6 py-12 text-center"
  >
    <UIcon name="i-lucide-scale" class="size-12 text-dimmed" />
    <h2 class="text-xl font-bold">{{ $t('weight.signedOut.title') }}</h2>
    <p class="max-w-sm text-muted">{{ $t('weight.signedOut.hint') }}</p>

    <template v-if="canSignIn">
      <AuthEmailForm class="mt-2" />

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
      {{ $t('weight.signedOut.unavailable') }}
    </p>
  </section>
</template>
