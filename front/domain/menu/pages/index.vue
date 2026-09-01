<script setup lang="ts">
const { menus, dayOrder } = useMenu();
const isMounted = useMounted();
const { t, locale } = useNuxtApp().$i18n;
const { round } = useFoodFormat();
const localePath = useLocalePath();

// Shared with the shopping list, the cooking session and the recipes: choosing
// a week here has to move the whole app with it.
const { selectedMenu: menu, isLoading, isDemo } = useSelectedWeek();

// The day a card stands for, counted from the Monday the week is stored under.
// Built here rather than in the card: only the page knows which week is on
// screen, and a card that guessed would be wrong the moment the week changed.
const dateOf = (index: number): Date | undefined => {
  if (menu.value === undefined) return undefined;

  const monday = new Date(`${menu.value.weekOf}T00:00:00`);
  monday.setDate(monday.getDate() + index);
  return monday;
};

const hasLaterWeek = computed((): boolean =>
  menus.some((other): boolean => other.weekOf > (menu.value?.weekOf ?? '')),
);

const averageMacros = computed((): Macros | undefined => {
  if (menu.value === undefined || menu.value.days.length === 0) return undefined;

  const { sumMacros } = useNutrition();
  const total = sumMacros(menu.value.days.map((day): Macros => day.macros));
  const count = menu.value.days.length;

  return {
    kcal: total.kcal / count,
    protein: total.protein / count,
    fat: total.fat / count,
    carbs: total.carbs / count,
    fiber: total.fiber / count,
  };
});

const { profile, hasAnswered } = useProfile();
const { statusOf, dayIndexOf, isWithin } = useWeekStatus();

// Everything date-related waits for the client: a prerendered page would freeze
// whatever day it was built on.
const now = computed((): Date | undefined => (isMounted.value ? new Date() : undefined));

// No "this week / past week" note on the example: it stands for a week, not a
// date, and telling a visitor the shop-window week is over reads as a bug.
const status = computed((): WeekStatus | undefined =>
  menu.value === undefined || now.value === undefined || isDemo.value
    ? undefined
    : statusOf(menu.value.weekOf, now.value),
);

const todayKey = computed((): DayKey | undefined => {
  if (menu.value === undefined || now.value === undefined) return undefined;
  // Only mark a day as "today" when today actually falls inside this menu's week.
  if (!isWithin(menu.value.weekOf, now.value)) return undefined;

  return dayOrder[dayIndexOf(now.value)];
});

const deliveryLabel = computed((): string | undefined => {
  if (menu.value?.deliveryAt === undefined) return undefined;

  return new Date(menu.value.deliveryAt).toLocaleString(locale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
});

const reminders = computed((): { icon: string; text: string }[] => [
  { icon: 'i-lucide-pill', text: t('menu.reminder.creatine') },
  { icon: 'i-lucide-glass-water', text: t('menu.reminder.water') },
  { icon: 'i-lucide-sun', text: t('menu.reminder.vitaminD') },
  {
    icon: 'i-lucide-scale',
    // The one habit that is not the same for everyone: which way the scale is
    // meant to move follows the goal. On the example (no profile) it reads as a
    // bulk, which is what the sample week is.
    text: t(`menu.reminder.weighIn.${profile.value?.goal ?? 'GAIN_MUSCLE'}`),
  },
]);

useSeoMeta({ title: (): string => t('menu.pageTitle') });
</script>

<template>
  <!-- data-hydrated marks the point where date-dependent bits (today, week
       status) are settled, so a test can wait for it instead of racing them. -->
  <div class="mx-auto max-w-5xl px-4 py-6 sm:py-10" :data-hydrated="isMounted ? '' : undefined">
    <!-- The reader's own week is still coming: hold the space rather than flash
         the "compose one" prompt at somebody who already has a week. -->
    <div v-if="isLoading" class="space-y-4 py-8" aria-hidden="true">
      <USkeleton class="h-24 rounded-2xl" />
      <USkeleton class="h-40 rounded-2xl" />
      <USkeleton class="h-40 rounded-2xl" />
    </div>
    <span v-if="isLoading" class="sr-only">{{ $t('accessibility.loading') }}</span>

    <template v-else>
      <!-- Nobody signed in: this is the shop window. A real week, fully weighed,
           under a line that says it is an example and a button to make it real. -->
      <div
        v-if="isDemo"
        class="rise mb-6 overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6"
      >
        <UBadge color="primary" variant="subtle" size="sm" class="mb-2">
          {{ $t('menu.example.badge') }}
        </UBadge>
        <h1 class="font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl">
          {{ $t('menu.example.title') }}
        </h1>
        <p class="mt-2 max-w-xl text-muted">{{ $t('menu.example.lead') }}</p>
        <UButton
          :to="localePath('/composer')"
          color="primary"
          size="xl"
          icon="i-lucide-square-pen"
          class="mt-4 font-semibold"
        >
          {{ $t('menu.example.cta') }}
        </UButton>
      </div>

      <div v-if="!isDemo" class="rise flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0">
          <h1 class="font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl">
            {{ $t('menu.pageTitle') }}
          </h1>
          <p class="mt-1.5 text-muted">{{ $t('menu.pageLead') }}</p>
        </div>

        <MenuWeekPicker v-if="!isDemo" />
      </div>

      <div
        v-if="status === undefined && !isDemo && menu !== undefined"
        class="mt-5 space-y-3"
        aria-hidden="true"
      >
        <USkeleton class="h-20 rounded-lg" />
      </div>
      <span v-if="status === undefined && !isDemo && menu !== undefined" class="sr-only">{{
        $t('accessibility.loading')
      }}</span>

      <UAlert
        v-if="status === 'upcoming'"
        class="rise mt-5"
        color="primary"
        variant="subtle"
        icon="i-lucide-truck"
        :title="$t('menu.status.upcoming')"
      >
        <template #description>
          <span v-if="deliveryLabel !== undefined" class="block">
            {{ $t('menu.status.deliveryOn') }} {{ deliveryLabel }}
          </span>
          <span class="block">{{ $t('menu.status.beforeStart') }}</span>
        </template>
      </UAlert>

      <UAlert
        v-else-if="status === 'past'"
        class="rise mt-5"
        color="neutral"
        variant="subtle"
        icon="i-lucide-clock-fading"
        :title="$t('menu.status.past')"
      >
        <template #description>
          {{ hasLaterWeek ? $t('menu.status.pastHasNext') : $t('menu.status.pastNoNext') }}
        </template>
      </UAlert>

      <!-- Above the week itself: what to eat on Monday matters more than
           re-reading a week already lived. -->
      <MenuPlanNextWeek v-if="!isDemo && menu !== undefined" class="mt-5" />

      <template v-if="menu !== undefined">
        <section
          class="rise mt-6"
          style="animation-delay: 80ms"
          :aria-label="$t('menu.weekSummary')"
        >
          <div class="grid gap-4 sm:grid-cols-3">
            <UCard class="sm:col-span-2">
              <p class="mb-4 text-sm font-semibold text-muted">{{ $t('menu.averagePerDay') }}</p>
              <div class="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
                <MenuMacroPlate v-if="averageMacros !== undefined" :macros="averageMacros" />
                <MenuMacroBar
                  v-if="averageMacros !== undefined"
                  :macros="averageMacros"
                  :targets="menu.targets"
                />
              </div>
            </UCard>

            <div class="grid grid-cols-2 gap-4 sm:grid-cols-1">
              <UCard>
                <p class="text-sm text-muted">{{ $t('menu.budget') }}</p>
                <p class="mt-1 text-2xl font-black tabular-nums">{{ round(menu.totalPrice) }} €</p>
              </UCard>
              <UCard>
                <p class="text-sm text-muted">{{ $t('menu.recipeCount') }}</p>
                <p class="mt-1 text-2xl font-black tabular-nums">{{ menu.recipes.length }}</p>
              </UCard>
            </div>
          </div>
        </section>

        <section class="rise mt-6 grid gap-3 sm:grid-cols-2" style="animation-delay: 140ms">
          <UButton
            :to="localePath('/courses')"
            icon="i-lucide-shopping-basket"
            size="xl"
            block
            class="font-semibold text-white"
          >
            {{ $t('menu.nav.shopping') }}
          </UButton>
          <UButton
            :to="localePath('/batch')"
            icon="i-lucide-chef-hat"
            size="xl"
            block
            variant="outline"
            class="font-semibold"
          >
            {{ $t('menu.nav.batch') }}
          </UButton>
        </section>

        <section class="mt-8 space-y-4">
          <MenuDayCard
            v-for="(day, index) in menu.days"
            :key="day.key"
            :day="day"
            :targets="menu.targets"
            :date="dateOf(index)"
            :index="index"
            :is-today="day.key === todayKey"
            :default-open="todayKey === undefined ? index === 0 : day.key === todayKey"
          />
        </section>

        <section
          class="rise mt-8 rounded-2xl border border-default bg-elevated/40 p-5"
          style="animation-delay: 120ms"
        >
          <h2 class="mb-3 flex items-center gap-2 font-bold">
            <UIcon name="i-lucide-alarm-clock-check" class="size-5 text-primary" />
            {{ $t('menu.reminder.title') }}
          </h2>
          <ul class="space-y-2">
            <li v-for="reminder in reminders" :key="reminder.text" class="flex items-start gap-2.5">
              <UIcon :name="reminder.icon" class="mt-0.5 size-4 shrink-0 text-primary" />
              <span class="text-sm text-muted">{{ reminder.text }}</span>
            </li>
          </ul>
        </section>
      </template>

      <!-- Signed in, this week not composed yet. No profile is a different
           answer from an empty week: one needs the questionnaire, the other the
           Composer, and sending someone to the wrong one is a dead end. -->
      <div v-else-if="!hasAnswered" class="flex flex-col items-center gap-3 py-20 text-center">
        <UIcon name="i-lucide-user-round-cog" class="size-12 text-dimmed" />
        <h2 class="text-xl font-bold">{{ $t('menu.needProfile.title') }}</h2>
        <p class="max-w-sm text-muted">{{ $t('menu.needProfile.hint') }}</p>
        <UButton
          :to="localePath('/profil')"
          color="primary"
          icon="i-lucide-user-round"
          class="mt-2"
        >
          {{ $t('menu.needProfile.action') }}
        </UButton>
      </div>
      <div v-else class="flex flex-col items-center gap-3 py-20 text-center">
        <UIcon name="i-lucide-calendar-plus" class="size-12 text-dimmed" />
        <h2 class="text-xl font-bold">{{ $t('menu.compose.title') }}</h2>
        <p class="max-w-sm text-muted">{{ $t('menu.compose.hint') }}</p>
        <UButton
          :to="localePath('/composer')"
          color="primary"
          icon="i-lucide-square-pen"
          class="mt-2"
        >
          {{ $t('menu.compose.action') }}
        </UButton>
      </div>
    </template>
  </div>
</template>
