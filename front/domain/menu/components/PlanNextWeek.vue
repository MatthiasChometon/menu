<script setup lang="ts">
const { weekOf, isPlanned } = useNextWeek();
const { locale } = useNuxtApp().$i18n;
const localePath = useLocalePath();

const monday = computed((): string =>
  weekOf.value === undefined
    ? ''
    : new Date(`${weekOf.value}T00:00:00`).toLocaleDateString(locale.value, {
        day: 'numeric',
        month: 'long',
      }),
);
</script>

<template>
  <!-- Only when there is nothing to eat on Monday. Repeating it once the week
       is planned would train the reader to skip the banner entirely. -->
  <UAlert
    v-if="weekOf !== undefined && !isPlanned"
    class="rise"
    color="primary"
    variant="subtle"
    icon="i-lucide-calendar-plus"
    :title="$t('menu.planNext.title')"
  >
    <template #description>
      <p>{{ $t('menu.planNext.hint') }} {{ monday }}.</p>
      <UButton
        :to="localePath('/composer')"
        color="primary"
        size="sm"
        class="mt-2"
        icon="i-lucide-square-pen"
      >
        {{ $t('menu.planNext.action') }}
      </UButton>
    </template>
  </UAlert>
</template>
