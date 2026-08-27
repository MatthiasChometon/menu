<script setup lang="ts">
const { selectedWeek, statusOfSelected, weekOptions } = useSelectedWeek();
const { keyOf } = useWeekLabel();
const { weekToShow } = useWeekStatus();
const { locale, t } = useNuxtApp().$i18n;

// Today is knowable only in the browser. Until it is, no week can be called
// "this week" without risking saying it of the wrong one.
const now = ref<Date | undefined>();

// The weeks a reader moves between are their own to compose — this one and the
// ones ahead — not a list of published files. Already in order.
const weeks = computed((): string[] => weekOptions.value);

const index = computed((): number => weeks.value.indexOf(selectedWeek.value));

const dateOf = (weekOf: string): string =>
  new Date(`${weekOf}T00:00:00`).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'long',
  });

// A name when the week has one, the date otherwise. Both are shown at once —
// "Cette semaine" tells you where you are, the date tells you which one.
const nameOf = (weekOf: string): string => {
  const key = now.value === undefined ? undefined : keyOf(weekOf, now.value);

  return key === undefined ? dateOf(weekOf) : t(`menu.week.${key}`);
};

const subtitleOf = (weekOf: string): string | undefined => {
  const key = now.value === undefined ? undefined : keyOf(weekOf, now.value);

  return key === undefined ? undefined : `${t('menu.weekOf')} ${dateOf(weekOf)}`;
};

// "Cette semaine · Cette semaine" reads as a stutter. The badge is only worth
// showing when the name is a bare date and says nothing about where it sits.
const showsStatus = computed(
  (): boolean =>
    statusOfSelected.value !== undefined &&
    now.value !== undefined &&
    keyOf(selectedWeek.value, now.value) === undefined,
);

const options = computed((): SelectItem[] =>
  weeks.value.map((weekOf): SelectItem => ({ label: nameOf(weekOf), value: weekOf })),
);

const go = (step: number): void => {
  const next = weeks.value[index.value + step];
  if (next !== undefined) selectedWeek.value = next;
};

// Where the app would open on its own. Offering it back is what lets someone
// wander through the weeks without having to remember which one was theirs.
const homeWeek = computed((): string | undefined =>
  now.value === undefined ? undefined : weekToShow(weeks.value, now.value),
);

const isAway = computed(
  (): boolean => homeWeek.value !== undefined && homeWeek.value !== selectedWeek.value,
);

onMounted((): void => {
  now.value = new Date();
});
</script>

<template>
  <div class="flex flex-col items-start gap-1 sm:items-end">
    <div class="flex items-center gap-1">
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="index <= 0"
        :aria-label="$t('menu.week.previous')"
        @click="go(-1)"
      />

      <USelect
        v-if="weeks.length > 1"
        v-model="selectedWeek"
        :items="options"
        value-key="value"
        icon="i-lucide-calendar-days"
        size="sm"
        class="min-w-40"
        :aria-label="$t('menu.week.choose')"
      />
      <span v-else class="inline-flex items-center gap-1.5 px-2 text-sm font-semibold">
        <UIcon name="i-lucide-calendar-days" class="size-4 text-dimmed" />
        {{ nameOf(selectedWeek) }}
      </span>

      <UButton
        icon="i-lucide-chevron-right"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="index < 0 || index >= weeks.length - 1"
        :aria-label="$t('menu.week.next')"
        @click="go(1)"
      />
    </div>

    <div class="flex min-h-5 items-center gap-2 px-2 text-xs text-muted">
      <span v-if="subtitleOf(selectedWeek)">{{ subtitleOf(selectedWeek) }}</span>
      <!-- A bare date never says whether it is behind or ahead. -->
      <UBadge
        v-if="showsStatus"
        :color="statusOfSelected === 'current' ? 'primary' : 'neutral'"
        variant="subtle"
        size="sm"
      >
        {{ $t(`menu.week.${statusOfSelected}`) }}
      </UBadge>
      <UButton
        v-if="isAway && homeWeek"
        color="primary"
        variant="link"
        size="xs"
        class="p-0"
        @click="selectedWeek = homeWeek"
      >
        {{ $t('menu.week.back') }}
      </UButton>
    </div>
  </div>
</template>
