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

const { targetRows, goalLabelOf, goalIconOf } = useProfileSummary();

useSeoMeta({ title: (): string => t('profile.pageTitle') });
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6 sm:py-10">
    <h1 class="font-serif text-4xl tracking-tight sm:text-5xl">{{ $t('profile.pageTitle') }}</h1>
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

        <!-- The goal first: the numbers underneath only mean something once
             you know what they are aiming at. -->
        <div
          class="mb-4 flex items-center gap-3 rounded-2xl border border-default bg-elevated/40 px-4 py-3"
        >
          <UIcon :name="goalIconOf(profile)" class="size-6 shrink-0 text-primary" />
          <div class="min-w-0">
            <p class="text-xs text-muted">{{ $t('profile.summary.goal') }}</p>
            <p class="truncate font-bold">{{ goalLabelOf(profile) }}</p>
          </div>
        </div>

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

      <!-- Only once the account holder has answered for themselves: the shares
           are worked out against their own targets, so there is nothing to
           share until those exist. -->
      <ProfileHousehold v-if="user !== undefined && hasAnswered && !isFillingIn" />

      <!-- Never while the form is open: an irreversible action has no business
           sitting under a form somebody is halfway through filling in. -->
      <AuthDeleteAccount v-if="user !== undefined && !isFillingIn" />
    </ClientOnly>
  </div>
</template>
