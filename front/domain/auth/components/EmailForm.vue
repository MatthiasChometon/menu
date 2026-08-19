<script setup lang="ts">
type Mode = 'login' | 'register' | 'forgot';

const { t } = useNuxtApp().$i18n;
const { credentials, isBusy, failure, register, signIn, resendLink, requestReset } = useEmailAuth();

const mode = ref<Mode>('login');
// Shown instead of the form once a link is on its way: leaving the fields there
// invites another attempt, when the only thing left to do is open an inbox.
const sentLink = ref<'verification' | 'reset' | undefined>();
const hasResent = ref(false);

const submit = async (): Promise<void> => {
  if (mode.value === 'register') {
    if ((await register()) === 'sent') sentLink.value = 'verification';
    return;
  }

  if (mode.value === 'forgot') {
    if ((await requestReset()) === 'sent') sentLink.value = 'reset';
    return;
  }

  await signIn();
};

const goTo = (next: Mode): void => {
  mode.value = next;
  failure.value = undefined;
};

const resend = async (): Promise<void> => {
  await resendLink();
  hasResent.value = true;
};

const errorMessage = computed((): string | undefined =>
  failure.value === undefined ? undefined : t(`auth.error.${failure.value}`),
);

const submitLabel = computed((): string => {
  if (mode.value === 'register') return t('auth.createAccount');

  return mode.value === 'forgot' ? t('auth.sendResetLink') : t('auth.signIn');
});
</script>

<template>
  <div class="w-full max-w-sm">
    <div v-if="sentLink" class="flex flex-col items-center gap-3 text-center">
      <UIcon name="i-lucide-mail-check" class="size-10 text-primary" />
      <p class="font-semibold">{{ $t('auth.sent.title') }}</p>
      <p class="text-sm text-muted">
        {{ sentLink === 'reset' ? $t('auth.sent.resetBody') : $t('auth.sent.body') }}
      </p>
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
      <!-- No password field when asking for a link: there is nothing to prove
           here, and a box to fill in would suggest otherwise. -->
      <UInput
        v-if="mode !== 'forgot'"
        v-model="credentials.password"
        type="password"
        :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
        required
        size="lg"
        :placeholder="$t('auth.passwordPlaceholder')"
        :aria-label="$t('auth.passwordLabel')"
      />

      <!-- The one failure the reader can fix from here, so it gets a button
           rather than a sentence pointing them elsewhere. -->
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
        {{ submitLabel }}
      </UButton>

      <div class="flex flex-col items-center">
        <UButton v-if="mode === 'login'" variant="link" size="sm" @click="goTo('forgot')">
          {{ $t('auth.forgotPassword') }}
        </UButton>
        <UButton
          variant="link"
          size="sm"
          @click="goTo(mode === 'register' || mode === 'forgot' ? 'login' : 'register')"
        >
          {{ mode === 'login' ? $t('auth.noAccount') : $t('auth.haveAccount') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
