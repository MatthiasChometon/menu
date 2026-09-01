<script setup lang="ts">
const { t } = useNuxtApp().$i18n;
const { entries } = useWeightLog();
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

    <!-- The diary lives in localStorage, which exists only in the browser.
         Rendering it on the server would prerender an empty diary and swap it
         at hydration, so the skeleton is what both sides render first. -->
    <ClientOnly>
      <template #fallback>
        <div class="grid gap-4">
          <USkeleton class="h-36 rounded-2xl" />
          <USkeleton class="h-56 rounded-2xl" />
          <USkeleton class="h-28 rounded-2xl" />
          <span class="sr-only">{{ $t('accessibility.loading') }}</span>
        </div>
      </template>

      <div class="grid gap-5">
        <WeightForm :default-kg="defaultKg" :focus-token="focusToken" />

        <WeightEmpty v-if="isEmpty" @add-first="requestFirstEntry" />

        <template v-else>
          <WeightChart />
          <WeightCoachCard />
          <WeightList />
        </template>
      </div>
    </ClientOnly>

    <!-- MVP note: the diary is kept on this device only. A server-backed sync
         is planned for a later phase, once accounts carry more than a
         profile — see the composable for the same note next to the store. -->
    <p class="mt-8 text-xs text-dimmed">{{ $t('weight.serverNote') }}</p>
  </div>
</template>
