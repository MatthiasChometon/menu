<script setup lang="ts">
const { menus } = useMenu();
const { selectedWeek, statusOfSelected } = useSelectedWeek();
const { locale } = useNuxtApp().$i18n;

const formatWeek = (weekOf: string): string =>
  new Date(`${weekOf}T00:00:00`).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'long',
  });

const weekItems = computed((): SelectItem[] =>
  menus.map((menu): SelectItem => ({ label: formatWeek(menu.weekOf), value: menu.weekOf })),
);

// Saying "this week" is only worth it when another week could be shown; with a
// single menu the badge is noise.
const statusLabel = computed((): string | undefined => {
  if (menus.length < 2 || statusOfSelected.value === undefined) return undefined;

  return statusOfSelected.value;
});
</script>

<template>
  <div v-if="menus.length > 1" class="flex flex-wrap items-center gap-2">
    <USelect
      v-model="selectedWeek"
      :items="weekItems"
      value-key="value"
      icon="i-lucide-calendar-days"
      size="sm"
      :aria-label="$t('menu.weekOf')"
    />
    <UBadge
      v-if="statusLabel !== undefined"
      :color="statusLabel === 'current' ? 'primary' : 'neutral'"
      variant="subtle"
      size="sm"
    >
      {{ $t(`menu.week.${statusLabel}`) }}
    </UBadge>
  </div>
</template>
