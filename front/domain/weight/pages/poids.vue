<script setup lang="ts">
const { t } = useNuxtApp().$i18n;
const { user, isLoading: isLoadingUser } = useAuth();
const { entries, isLoading: isLoadingEntries, hasFailed, refresh } = useWeightLog();
const { profile } = useProfile();

const isEmpty = computed((): boolean => entries.value.length === 0);

// The most recent weigh-in already logged, or the profile's own weight
// before a single one exists — either way, someone opening the form for the
// first time never faces a blank field guessing at their own weight.
const defaultKg = computed(
  (): number | undefined => entries.value[0]?.kg ?? profile.value?.weightKg,
);

const focusToken = ref(0);
const requestFirstEntry = (): void => {
  focusToken.value += 1;
};

useSeoMeta({ title: (): string => t('weight.pageTitle') });
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6 sm:py-10">
    <h1 class="font-serif text-4xl tracking-tight sm:text-5xl">{{ $t('weight.pageTitle') }}</h1>
    <p class="mt-1 mb-8 text-muted">{{ $t('weight.pageLead') }}</p>

    <!-- The diary is synced through the session cookie, which exists only in
         the browser. Rendering it on the server would prerender a signed-out
         page and swap it at hydration, so the skeleton is what both sides
         render first. -->
    <ClientOnly>
      <template #fallback>
        <div class="grid gap-4">
          <USkeleton class="h-36 rounded-2xl" />
          <USkeleton class="h-56 rounded-2xl" />
          <USkeleton class="h-28 rounded-2xl" />
          <span class="sr-only">{{ $t('accessibility.loading') }}</span>
        </div>
      </template>

      <div v-if="isLoadingUser" class="grid gap-4">
        <USkeleton class="h-36 rounded-2xl" />
        <USkeleton class="h-56 rounded-2xl" />
        <USkeleton class="h-28 rounded-2xl" />
        <span class="sr-only">{{ $t('accessibility.loading') }}</span>
      </div>

      <WeightSignInPrompt v-else-if="!user" />

      <template v-else>
        <div v-if="isLoadingEntries" class="grid gap-4">
          <USkeleton class="h-36 rounded-2xl" />
          <USkeleton class="h-56 rounded-2xl" />
          <USkeleton class="h-28 rounded-2xl" />
          <span class="sr-only">{{ $t('accessibility.loading') }}</span>
        </div>

        <UAlert
          v-else-if="hasFailed"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="$t('weight.loadFailed')"
        >
          <template #actions>
            <UButton color="error" variant="subtle" @click="refresh">
              {{ $t('weight.retry') }}
            </UButton>
          </template>
        </UAlert>

        <div v-else class="grid gap-5">
          <WeightForm :default-kg="defaultKg" :focus-token="focusToken" />

          <WeightEmpty v-if="isEmpty" @add-first="requestFirstEntry" />

          <template v-else>
            <WeightChart />
            <WeightCoachCard />
            <WeightList />
          </template>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
