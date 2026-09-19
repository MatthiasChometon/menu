<script setup lang="ts">
const { selectedWeek, estimatedTotal } = defineProps<{
  selectedWeek: string;
  estimatedTotal: number;
}>();

const { actualEuros, setActual } = useShoppingSpend((): string => selectedWeek);

// The field mirrors the stored amount but is edited as text, so a half-typed
// number never round-trips through storage until the reader is done.
const spentInput = ref<string>(actualEuros.value?.toString() ?? '');
watch(actualEuros, (value): void => {
  spentInput.value = value?.toString() ?? '';
});
const commitSpent = (): void => {
  const typed = spentInput.value.trim();
  setActual(typed === '' ? undefined : Number(typed));
};

// Real minus estimate: positive when the week cost more than the menu said it
// would, undefined until a real amount is entered.
const spendDelta = computed((): number | undefined =>
  actualEuros.value === undefined ? undefined : actualEuros.value - estimatedTotal,
);

// The signed amount, sign and all, built here so the template carries no bare
// "+" the way the raw-text rule rightly forbids.
const spendDeltaLabel = computed((): string => {
  if (spendDelta.value === undefined) return '';
  const rounded = Math.round(spendDelta.value);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
});
</script>

<template>
  <div
    class="rise mt-4 rounded-2xl border border-default bg-default/90 p-4"
    style="animation-delay: 90ms"
  >
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <label for="spent" class="text-sm font-medium text-muted">
          {{ $t('shopping.spend.title') }}
        </label>
        <UInput
          id="spent"
          v-model="spentInput"
          type="number"
          min="0"
          inputmode="decimal"
          class="mt-1 w-40"
          :placeholder="$t('shopping.spend.placeholder')"
          :ui="{ trailing: 'pointer-events-none' }"
          @blur="commitSpent"
          @keydown.enter="commitSpent"
        >
          <template #trailing>
            <span class="text-sm text-muted" aria-hidden="true">€</span>
          </template>
        </UInput>
      </div>
      <dl class="flex items-center gap-5 tabular-nums">
        <div>
          <dt class="text-xs text-dimmed">{{ $t('shopping.spend.estimated') }}</dt>
          <dd class="text-lg font-bold">{{ Math.round(estimatedTotal) }} €</dd>
        </div>
        <div v-if="spendDelta !== undefined">
          <dt class="text-xs text-dimmed">{{ $t('shopping.spend.delta') }}</dt>
          <dd class="text-lg font-bold" :class="spendDelta <= 0 ? 'text-primary' : 'text-error'">
            {{ spendDeltaLabel }} €
            <span class="text-xs font-medium">
              {{ spendDelta <= 0 ? $t('shopping.spend.under') : $t('shopping.spend.over') }}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>
