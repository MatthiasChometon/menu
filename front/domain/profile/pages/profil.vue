<script setup lang="ts">
import type { MeasurementsInput } from '#gql';
const { t } = useNuxtApp().$i18n;
const { user, isLoading: isLoadingUser } = useAuth();
const { profile, isLoading: isLoadingProfile, hasAnswered } = useProfile();

const isEditing = ref(false);
const justSaved = ref(false);

// Someone arriving without answers goes straight into the form: the profile is
// the whole point of having an account here.
const isFillingIn = computed((): boolean => isEditing.value || !hasAnswered.value);

const onSaved = (): void => {
  isEditing.value = false;
  justSaved.value = true;
};

// The saved profile carries its computed targets; the form only takes answers.
const answersOf = (saved: Profile): MeasurementsInput => {
  const { targets: _targets, ...answers } = saved;
  return answers;
};

const { targetRows } = useProfileSummary();

useSeoMeta({ title: (): string => t('profile.pageTitle') });
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6 sm:py-10">
    <h1 class="text-3xl font-black tracking-tight sm:text-4xl">{{ $t('profile.pageTitle') }}</h1>
    <p class="mt-1 mb-8 text-muted">{{ $t('profile.pageLead') }}</p>

    <!-- Everything below depends on the session cookie, which exists only in the
         browser. Rendering it on the server would prerender a signed-out page
         and then swap it at hydration, so the skeleton is what both sides
         render first. -->
    <ClientOnly>
      <template #fallback>
        <div class="grid gap-3">
          <USkeleton v-for="row in 4" :key="row" class="h-16 rounded-2xl" />
          <span class="sr-only">{{ $t('accessibility.loading') }}</span>
        </div>
      </template>

      <div v-if="isLoadingUser || isLoadingProfile" class="grid gap-3">
        <USkeleton v-for="row in 4" :key="row" class="h-16 rounded-2xl" />
        <span class="sr-only">{{ $t('accessibility.loading') }}</span>
      </div>

      <ProfileSignInPrompt v-else-if="!user" />

      <ProfileForm
        v-else-if="isFillingIn"
        :initial="profile ? answersOf(profile) : undefined"
        @saved="onSaved"
      />

      <section v-else-if="profile">
        <UAlert
          v-if="justSaved"
          class="mb-5"
          color="success"
          variant="subtle"
          icon="i-lucide-check"
          :title="$t('profile.settings.saved')"
        />

        <div class="mb-6 grid gap-2 sm:grid-cols-2">
          <div
            v-for="row in targetRows(profile.targets)"
            :key="row.label"
            class="flex items-baseline justify-between rounded-xl border border-default bg-elevated/40 px-4 py-3"
          >
            <dt class="text-muted">{{ row.label }}</dt>
            <dd class="text-lg font-bold tabular-nums">{{ row.value }}</dd>
          </div>
        </div>

        <UButton size="xl" block icon="i-lucide-pencil" variant="outline" @click="isEditing = true">
          {{ $t('profile.settings.edit') }}
        </UButton>
      </section>

      <AuthDeleteAccount v-if="user !== undefined" />
    </ClientOnly>
  </div>
</template>
