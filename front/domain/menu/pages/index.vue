<script setup lang="ts">
const { menus, currentMenu, dayOrder } = useMenu();
const isMounted = useMounted();
const { t, locale } = useNuxtApp().$i18n;
const { round } = useFoodFormat();
const localePath = useLocalePath();

const selectedWeek = ref(currentMenu?.weekOf ?? '');

const menu = computed((): Menu | undefined =>
  menus.find((entry): boolean => entry.weekOf === selectedWeek.value),
);

const weekItems = computed((): SelectItem[] =>
  menus.map((entry): SelectItem => ({ label: formatWeek(entry.weekOf), value: entry.weekOf })),
);

const formatWeek = (weekOf: string): string =>
  new Date(`${weekOf}T00:00:00`).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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

const { statusOf, dayIndexOf, isWithin } = useWeekStatus();

// Everything date-related waits for the client: a prerendered page would freeze
// whatever day it was built on.
const now = computed((): Date | undefined => (isMounted.value ? new Date() : undefined));

const status = computed((): WeekStatus | undefined =>
  menu.value === undefined || now.value === undefined
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
  { icon: 'i-lucide-scale', text: t('menu.reminder.weighIn') },
]);

useSeoMeta({ title: (): string => t('menu.pageTitle') });
</script>

<template>
  <!-- data-hydrated marks the point where date-dependent bits (today, week
       status) are settled, so a test can wait for it instead of racing them. -->
  <div class="mx-auto max-w-5xl px-4 py-6 sm:py-10" :data-hydrated="isMounted ? '' : undefined">
    <template v-if="menu === undefined">
      <div class="flex flex-col items-center gap-3 py-20 text-center">
        <UIcon name="i-lucide-calendar-x" class="size-12 text-dimmed" />
        <h1 class="text-xl font-bold">{{ $t('menu.empty.title') }}</h1>
        <p class="max-w-sm text-muted">{{ $t('menu.empty.hint') }}</p>
      </div>
    </template>

    <template v-else>
      <div class="rise flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0">
          <h1 class="text-3xl font-black tracking-tight sm:text-4xl">
            {{ $t('menu.pageTitle') }}
          </h1>
          <p class="mt-1 text-muted">{{ $t('menu.pageLead') }}</p>
        </div>

        <USelect
          v-if="menus.length > 1"
          v-model="selectedWeek"
          :items="weekItems"
          value-key="value"
          icon="i-lucide-calendar-days"
          :aria-label="$t('menu.weekOf')"
        />
        <p v-else class="text-sm text-muted">
          {{ $t('menu.weekOf') }} {{ formatWeek(menu.weekOf) }}
        </p>
      </div>

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
        icon="i-lucide-history"
        :title="$t('menu.status.past')"
      />

      <section class="rise mt-6" style="animation-delay: 80ms" :aria-label="$t('menu.weekSummary')">
        <div class="grid gap-4 sm:grid-cols-3">
          <UCard class="sm:col-span-2">
            <p class="mb-3 text-sm font-semibold text-muted">{{ $t('menu.averagePerDay') }}</p>
            <MenuMacroBar
              v-if="averageMacros !== undefined"
              :macros="averageMacros"
              :targets="menu.targets"
            />
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
  </div>
</template>
