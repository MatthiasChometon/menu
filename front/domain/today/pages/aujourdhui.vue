<script setup lang="ts">
const isMounted = useMounted();
// Shared with useDailyChecklist, so the reminders and the water both settle on
// the same instant as the meal card rather than drifting a tick apart.
const now = computed((): Date | undefined => (isMounted.value ? new Date() : undefined));

const { t } = useNuxtApp().$i18n;
const localePath = useLocalePath();

const { user } = useAuth();
const { hasAnswered } = useProfile();

const { isLoading, hasMenuToday, isFeaturedCurrent, featuredMeal, upcomingMeal } = useToday();

const {
  reminderItems,
  reminderStreak,
  toggleReminder,
  hydrationGlasses,
  hydrationTargetGlasses,
  hydrationMaxGlasses,
  hydrationLiters,
  hasReachedHydrationTarget,
  toggleHydrationGlass,
} = useDailyChecklist(now);

useSeoMeta({ title: (): string => t('today.pageTitle') });
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6 sm:py-10">
    <!-- Everything here depends on the client's clock: before it is known, hold
         the whole layout's shape rather than flash a wrong "now". -->
    <div v-if="isLoading" class="space-y-4 py-8" aria-hidden="true">
      <USkeleton class="h-10 w-48 rounded-lg" />
      <USkeleton class="h-40 rounded-2xl" />
      <USkeleton class="h-32 rounded-2xl" />
      <USkeleton class="h-32 rounded-2xl" />
    </div>
    <span v-if="isLoading" class="sr-only">{{ $t('accessibility.loading') }}</span>

    <template v-else>
      <header class="rise">
        <h1 class="font-serif text-4xl tracking-tight sm:text-5xl">{{ $t('today.pageTitle') }}</h1>
        <p class="mt-1.5 text-muted">{{ $t('today.pageLead') }}</p>
      </header>

      <TodayNowCard
        v-if="hasMenuToday && featuredMeal !== undefined"
        class="rise mt-6"
        style="animation-delay: 60ms"
        :featured-meal="featuredMeal"
        :upcoming-meal="upcomingMeal"
        :is-current="isFeaturedCurrent"
      />

      <div
        v-else
        class="rise mt-6 flex flex-col items-center gap-3 rounded-2xl border border-default bg-elevated/40 py-14 text-center"
      >
        <template v-if="user === undefined">
          <UIcon name="i-lucide-calendar-x" class="size-11 text-dimmed" />
          <h2 class="text-lg font-bold">{{ $t('today.empty.signedOut.title') }}</h2>
          <p class="max-w-sm text-sm text-muted">{{ $t('today.empty.signedOut.hint') }}</p>
          <UButton :to="localePath('/')" color="primary" icon="i-lucide-calendar-days" class="mt-1">
            {{ $t('today.empty.signedOut.action') }}
          </UButton>
        </template>
        <template v-else-if="!hasAnswered">
          <UIcon name="i-lucide-user-round-cog" class="size-11 text-dimmed" />
          <h2 class="text-lg font-bold">{{ $t('today.empty.needProfile.title') }}</h2>
          <p class="max-w-sm text-sm text-muted">{{ $t('today.empty.needProfile.hint') }}</p>
          <UButton
            :to="localePath('/profil')"
            color="primary"
            icon="i-lucide-user-round"
            class="mt-1"
          >
            {{ $t('today.empty.needProfile.action') }}
          </UButton>
        </template>
        <template v-else>
          <UIcon name="i-lucide-calendar-plus" class="size-11 text-dimmed" />
          <h2 class="text-lg font-bold">{{ $t('today.empty.noMenu.title') }}</h2>
          <p class="max-w-sm text-sm text-muted">{{ $t('today.empty.noMenu.hint') }}</p>
          <UButton
            :to="localePath('/composer')"
            color="primary"
            icon="i-lucide-square-pen"
            class="mt-1"
          >
            {{ $t('today.empty.noMenu.action') }}
          </UButton>
        </template>
      </div>

      <TodayRemindersChecklist
        class="rise mt-6"
        style="animation-delay: 120ms"
        :items="reminderItems"
        :streak="reminderStreak"
        @toggle="toggleReminder"
      />

      <TodayHydrationTracker
        class="rise mt-6"
        style="animation-delay: 160ms"
        :glasses="hydrationGlasses"
        :target-glasses="hydrationTargetGlasses"
        :max-glasses="hydrationMaxGlasses"
        :liters="hydrationLiters"
        :has-reached-target="hasReachedHydrationTarget"
        @toggle-glass="toggleHydrationGlass"
      />
    </template>
  </div>
</template>
