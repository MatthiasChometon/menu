<script setup lang="ts">
const { t } = useNuxtApp().$i18n;
const { profile } = useProfile();

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
</script>

<template>
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
