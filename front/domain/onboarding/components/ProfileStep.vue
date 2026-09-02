<script setup lang="ts">
import type { MeasurementsInput } from '#gql';

const emit = defineEmits<{ done: [] }>();
const { user } = useAuth();
const { save: saveMyProfile } = useProfile();
const { draft, save: saveDraft } = useOnboardingDraftProfile();

// Signed in, the answers go straight to the account, exactly like the
// settings page. Signed out, there is no account yet to save them to — they
// stay on this device until one exists, and the profile page picks the draft
// back up once it does.
const saveAnswers = async (answers: MeasurementsInput): Promise<void> => {
  if (user.value !== undefined) {
    await saveMyProfile(answers);
    return;
  }
  saveDraft(answers);
};
</script>

<template>
  <div>
    <h1 class="mb-1 font-serif text-3xl tracking-tight sm:text-4xl">
      {{ $t('onboarding.profile.title') }}
    </h1>
    <p class="mb-6 text-muted">{{ $t('onboarding.profile.lead') }}</p>

    <UAlert
      v-if="user === undefined"
      class="mb-6"
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      :title="$t('onboarding.profile.localNotice')"
    />

    <ProfileForm :initial="draft" :save="saveAnswers" @saved="emit('done')" />
  </div>
</template>
