<script setup lang="ts">
// Inline editing and inline removal, the same shape as the household list:
// the row being changed carries its own small form, and removal is asked for
// in place rather than behind a dialog.
const { entries, update, remove, errorOf, bounds, todayDate } = useWeightLog();
const { t, locale } = useNuxtApp().$i18n;

type Draft = { date: string; kg: number };

const editingId = ref<string>();
const draft = ref<Draft>();
const editError = ref<string>();
const removingId = ref<string>();

const startEdit = (entry: WeightEntry): void => {
  editingId.value = entry.id;
  draft.value = { date: entry.date, kg: entry.kg };
  editError.value = undefined;
};

const cancelEdit = (): void => {
  editingId.value = undefined;
  draft.value = undefined;
  editError.value = undefined;
};

const saveEdit = (): void => {
  if (editingId.value === undefined || draft.value === undefined) return;

  const validation = errorOf(draft.value);
  editError.value = validation;
  if (validation !== undefined) return;

  update(editingId.value, draft.value);
  cancelEdit();
};

const confirmRemoval = (id: string): void => {
  removingId.value = undefined;
  remove(id);
};

const dateLabelOf = (entry: WeightEntry): string =>
  new Date(`${entry.date}T00:00:00`).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

type Row = {
  entry: WeightEntry;
  dateLabel: string;
  editLabel: string;
  deleteLabel: string;
  /** Against the weigh-in right before it — the previous row down the list,
   *  since the newest comes first — so a glance down the diary shows the same
   *  small steps the chart draws as a line. Undefined for the oldest entry. */
  deltaLabel: string | undefined;
  isGain: boolean;
};

const rows = computed((): Row[] =>
  entries.value.map((entry, index): Row => {
    const previous = entries.value[index + 1];
    const dateLabel = dateLabelOf(entry);
    const delta = previous === undefined ? undefined : entry.kg - previous.kg;

    return {
      entry,
      dateLabel,
      editLabel: `${t('weight.log.edit')} ${dateLabel}`,
      deleteLabel: `${t('weight.log.delete')} ${dateLabel}`,
      deltaLabel: delta === undefined ? undefined : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`,
      isGain: (delta ?? 0) >= 0,
    };
  }),
);
</script>

<template>
  <ul class="grid gap-2">
    <li
      v-for="row in rows"
      :key="row.entry.id"
      class="rounded-2xl border border-default bg-elevated/40 px-4 py-3"
    >
      <div
        v-if="editingId === row.entry.id && draft"
        class="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]"
      >
        <UFormField :label="$t('weight.log.kgLabel')">
          <UInput
            v-model.number="draft.kg"
            type="number"
            inputmode="decimal"
            step="0.1"
            :min="bounds.minKg"
            :max="bounds.maxKg"
            size="lg"
          />
        </UFormField>
        <UFormField :label="$t('weight.log.dateLabel')">
          <UInput v-model="draft.date" type="date" :max="todayDate" size="lg" />
        </UFormField>
        <UButton color="neutral" variant="ghost" size="lg" @click="cancelEdit">
          {{ $t('weight.log.cancel') }}
        </UButton>
        <UButton size="lg" class="font-semibold text-white" @click="saveEdit">
          {{ $t('weight.log.save') }}
        </UButton>

        <UAlert
          v-if="editError"
          class="sm:col-span-4"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="editError"
        />
      </div>

      <div v-else class="flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-lg font-bold tabular-nums">
            {{ row.entry.kg.toFixed(1) }}
            <span class="text-sm font-normal text-muted">{{ $t('weight.log.kgUnit') }}</span>
          </p>
          <p class="text-sm text-muted">{{ row.dateLabel }}</p>
        </div>

        <p
          v-if="row.deltaLabel !== undefined"
          class="shrink-0 text-sm font-semibold tabular-nums"
          :class="row.isGain ? 'text-primary' : 'text-warning'"
        >
          {{ row.deltaLabel }}
        </p>

        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-pencil"
          :aria-label="row.editLabel"
          @click="startEdit(row.entry)"
        />
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-trash-2"
          :aria-label="row.deleteLabel"
          @click="removingId = row.entry.id"
        />
      </div>

      <div
        v-if="removingId === row.entry.id"
        class="mt-3 flex flex-wrap items-center gap-3 border-t border-default pt-3"
      >
        <p class="text-sm">{{ $t('weight.log.deleteConfirm') }}</p>
        <div class="ml-auto flex gap-2">
          <UButton color="neutral" variant="ghost" @click="removingId = undefined">
            {{ $t('weight.log.cancel') }}
          </UButton>
          <UButton color="error" @click="confirmRemoval(row.entry.id)">
            {{ $t('weight.log.deleteYes') }}
          </UButton>
        </div>
      </div>
    </li>
  </ul>
</template>
