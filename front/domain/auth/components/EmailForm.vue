<script setup lang="ts">
const { t } = useNuxtApp().$i18n;
const { credentials, isBusy, failure, register, signIn, resendLink } = useEmailAuth();

const isRegistering = ref(false);
// Shown instead of the form once a link is on its way: leaving the fields there
// invites a second attempt, when the only thing left to do is open an inbox.
const hasSentLink = ref(false);
const hasResent = ref(false);

const submit = async (): Promise<void> => {
  if (isRegistering.value) {
    hasSentLink.value = (await register()) === 'sent';
    return;
  }

  await signIn();
};

const switchMode = (): void => {
  isRegistering.value = !isRegistering.value;
  failure.value = undefined;
};

const resend = async (): Promise<void> => {
  await resendLink();
  hasResent.value = true;
};

const errorMessage = computed((): string | undefined => {
  if (failure.value === undefined) return undefined;

  return t(`auth.error.${failure.value}`);
});
</script>

<template>
  <div class="w-full max-w-sm">
    <div v-if="hasSentLink" class="flex flex-col items-center gap-3 text-center">
      <UIcon name="i-lucide-mail-check" class="size-10 text-primary" />
      <p class="font-semibold">{{ $t('auth.sent.title') }}</p>
      <p class="text-sm text-muted">{{ $t('auth.sent.body') }}</p>
    </div>

    <form v-else class="flex flex-col gap-3" @submit.prevent="submit">
      <UInput
        v-model="credentials.email"
        type="email"
        autocomplete="email"
        required
        size="lg"
        :placeholder="$t('auth.emailPlaceholder')"
        :aria-label="$t('auth.emailLabel')"
      />
      <UInput
        v-model="credentials.password"
        type="password"
        :autocomplete="isRegistering ? 'new-password' : 'current-password'"
        required
        size="lg"
        :placeholder="$t('auth.passwordPlaceholder')"
        :aria-label="$t('auth.passwordLabel')"
      />

      <!-- The one failure the reader can fix from here, so it gets a button
           rather than a sentence telling them to look elsewhere. -->
      <div
        v-if="failure === 'unverified'"
        class="rounded-lg bg-elevated px-3 py-2 text-sm text-muted"
      >
        <p>{{ $t('auth.error.unverified') }}</p>
        <UButton
          v-if="!hasResent"
          variant="link"
          size="sm"
          class="px-0"
          :loading="isBusy"
          @click="resend"
        >
          {{ $t('auth.resend') }}
        </UButton>
        <p v-else class="mt-1 font-medium text-primary">{{ $t('auth.resent') }}</p>
      </div>
      <p v-else-if="errorMessage" role="alert" class="text-sm text-error">{{ errorMessage }}</p>

      <UButton type="submit" size="lg" block :loading="isBusy" class="font-semibold">
        {{ isRegistering ? $t('auth.createAccount') : $t('auth.signIn') }}
      </UButton>

      <UButton variant="link" size="sm" class="self-center" @click="switchMode">
        {{ isRegistering ? $t('auth.haveAccount') : $t('auth.noAccount') }}
      </UButton>
    </form>
  </div>
</template>
