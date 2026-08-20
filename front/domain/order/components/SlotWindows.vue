<script setup lang="ts">
import type { SlotWindow } from '../composables/useSlotWindows';

// Three named stretches rather than free hours: nobody wants to type 480 to
// mean eight o'clock, and a delivery is welcome by half-day, not by minute.
const PERIODS = [
  { key: 'morning', startMinute: 8 * 60, endMinute: 12 * 60 },
  { key: 'afternoon', startMinute: 12 * 60, endMinute: 18 * 60 },
  { key: 'evening', startMinute: 18 * 60, endMinute: 21 * 60 },
];

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

const { windows, isSaving, refresh, save } = useSlotWindows();

const isTicked = (weekday: number, period: (typeof PERIODS)[number]): boolean =>
  windows.value.some(
    (window): boolean =>
      window.weekday === weekday &&
      window.startMinute === period.startMinute &&
      window.endMinute === period.endMinute,
  );

const toggle = (weekday: number, period: (typeof PERIODS)[number]): void => {
  windows.value = isTicked(weekday, period)
    ? windows.value.filter(
        (window): boolean =>
          !(window.weekday === weekday && window.startMinute === period.startMinute),
      )
    : [...windows.value, { weekday, startMinute: period.startMinute, endMinute: period.endMinute }];
};

const submit = async (): Promise<void> => {
  await save(windows.value as SlotWindow[]);
};

onMounted((): void => {
  void refresh();
});
</script>

<template>
  <section class="rounded-xl border border-default p-4">
    <h2 class="font-bold">{{ $t('order.slots.title') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('order.slots.lead') }}</p>

    <div class="mt-3 overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr>
            <th class="sr-only">{{ $t('order.slots.title') }}</th>
            <th v-for="period in PERIODS" :key="period.key" class="px-2 pb-1 font-medium">
              {{ $t(`order.slots.${period.key}`) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="weekday in WEEKDAYS" :key="weekday">
            <th scope="row" class="py-1 pr-2 text-left font-normal">
              {{ $t(`order.weekday.${weekday}`) }}
            </th>
            <td v-for="period in PERIODS" :key="period.key" class="px-2 py-1 text-center">
              <input
                type="checkbox"
                class="size-5"
                :checked="isTicked(weekday, period)"
                :aria-label="`${$t(`order.weekday.${weekday}`)} ${$t(`order.slots.${period.key}`)}`"
                @change="toggle(weekday, period)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="windows.length === 0" class="mt-2 text-sm text-muted">
      {{ $t('order.slots.none') }}
    </p>

    <button
      type="button"
      class="mt-3 w-full rounded-lg bg-primary px-4 py-2 font-semibold text-inverted disabled:opacity-60"
      :disabled="isSaving"
      @click="submit"
    >
      {{ isSaving ? $t('order.slots.saving') : $t('order.slots.save') }}
    </button>
  </section>
</template>
