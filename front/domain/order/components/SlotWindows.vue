<script setup lang="ts">
// Three named stretches rather than free hours: nobody wants to type 480 to
// mean eight o'clock, and a delivery is welcome by half-day, not by minute.
const PERIODS = [
  { key: 'morning', startMinute: 8 * 60, endMinute: 12 * 60 },
  { key: 'afternoon', startMinute: 12 * 60, endMinute: 18 * 60 },
  { key: 'evening', startMinute: 18 * 60, endMinute: 21 * 60 },
] as const;

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

const { periodLabel, weekdayLabel } = useOrderLabels();
const { reportError } = useErrorReporting();
const loadFailed = ref(false);
const saveFailed = ref(false);

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
  saveFailed.value = false;

  try {
    await save(windows.value);
  } catch (failure) {
    reportError('order:slots-save', failure);
    saveFailed.value = true;
  }
};

const load = async (): Promise<void> => {
  loadFailed.value = false;

  try {
    await refresh();
  } catch (failure) {
    reportError('order:slots-load', failure);
    loadFailed.value = true;
  }
};

onMounted(load);
</script>

<template>
  <section class="rounded-xl border border-default p-4">
    <h2 class="font-bold">{{ $t('order.slots.title') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('order.slots.lead') }}</p>

    <!-- Without what is saved, the form would read as empty and saving it would
         wipe the real choice: it is not shown until the load works. -->
    <OrderLoadFailed v-if="loadFailed" :message="$t('order.loadFailed.slots')" @retry="load" />

    <template v-else>
      <div class="mt-3 overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr>
              <th class="sr-only">{{ $t('order.slots.title') }}</th>
              <th v-for="period in PERIODS" :key="period.key" class="px-2 pb-1 font-medium">
                {{ periodLabel(period.key) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="weekday in WEEKDAYS" :key="weekday">
              <th scope="row" class="py-1 pr-2 text-left font-normal">
                {{ weekdayLabel(weekday) }}
              </th>
              <td v-for="period in PERIODS" :key="period.key" class="px-2 py-1 text-center">
                <input
                  type="checkbox"
                  class="size-5"
                  :checked="isTicked(weekday, period)"
                  :aria-label="`${weekdayLabel(weekday)} ${periodLabel(period.key)}`"
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
      <p v-if="saveFailed" class="mt-2 text-sm text-error" role="alert">
        {{ $t('order.saveFailed') }}
      </p>
    </template>
  </section>
</template>
