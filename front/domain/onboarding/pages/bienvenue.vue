<script setup lang="ts">
const { t } = useNuxtApp().$i18n;
const localePath = useLocalePath();
const { dismiss } = useOnboardingStatus();

type Phase = 'intro' | 'profile' | 'generate';
const phase = ref<Phase>('intro');

// Reached either by finishing the questions or by skipping straight to it:
// either way the reader has been offered the walkthrough, so it stops being
// proposed again.
const enterGenerate = (): void => {
  phase.value = 'generate';
  dismiss();
};

const skip = async (): Promise<void> => {
  dismiss();
  await navigateTo(localePath('/'));
};

useSeoMeta({ title: (): string => t('onboarding.pageTitle') });
</script>

<template>
  <div class="mx-auto max-w-lg px-4 py-6 sm:py-10">
    <div class="mb-2 flex items-center justify-end">
      <UButton v-if="phase !== 'generate'" variant="ghost" color="neutral" size="sm" @click="skip">
        {{ $t('onboarding.skip') }}
      </UButton>
    </div>

    <OnboardingIntroSlides v-if="phase === 'intro'" @finished="phase = 'profile'" />
    <OnboardingProfileStep v-else-if="phase === 'profile'" @done="enterGenerate" />
    <OnboardingGenerateStep v-else />
  </div>
</template>
