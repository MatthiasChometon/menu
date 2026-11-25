<script setup lang="ts">
const { quantities } = defineProps<{ quantities: FoodQuantity[] }>();

const { microsOfQuantities, highlightsOf } = useMicros();
const { t } = useNuxtApp().$i18n;

// Literal keys, so the translation checker sees every one of them.
const names = computed((): Record<MicroKey, string> => ({
  iron: t('recipe.micro.name.iron'),
  zinc: t('recipe.micro.name.zinc'),
  magnesium: t('recipe.micro.name.magnesium'),
  calcium: t('recipe.micro.name.calcium'),
  potassium: t('recipe.micro.name.potassium'),
  vitaminC: t('recipe.micro.name.vitaminC'),
  vitaminD: t('recipe.micro.name.vitaminD'),
  omega3: t('recipe.micro.name.omega3'),
}));
const reasons = computed((): Record<MicroKey, string> => ({
  iron: t('recipe.micro.why.iron'),
  zinc: t('recipe.micro.why.zinc'),
  magnesium: t('recipe.micro.why.magnesium'),
  calcium: t('recipe.micro.why.calcium'),
  potassium: t('recipe.micro.why.potassium'),
  vitaminC: t('recipe.micro.why.vitaminC'),
  vitaminD: t('recipe.micro.why.vitaminD'),
  omega3: t('recipe.micro.why.omega3'),
}));

const highlights = computed((): MicroHighlight[] => highlightsOf(microsOfQuantities(quantities)));

const format = (highlight: MicroHighlight): string =>
  highlight.amount >= 10 ? String(Math.round(highlight.amount)) : highlight.amount.toFixed(1);
</script>

<template>
  <div>
    <p class="text-sm text-muted">{{ $t('recipe.micro.lead') }}</p>

    <p v-if="highlights.length === 0" class="mt-3 text-sm text-dimmed">
      {{ $t('recipe.micro.none') }}
    </p>

    <ul v-else class="mt-3 space-y-2.5">
      <li
        v-for="highlight in highlights"
        :key="highlight.key"
        class="rounded-2xl border border-default bg-elevated/30 p-3.5"
      >
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-semibold">{{ names[highlight.key] }}</span>
          <span class="shrink-0 text-sm tabular-nums text-muted">
            {{ format(highlight) }} {{ highlight.unit }}
          </span>
        </div>

        <div class="mt-2 flex items-center gap-3">
          <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
            <div
              class="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
              :style="{ width: `${Math.min(100, highlight.percentOfTarget)}%` }"
            />
          </div>
          <span class="shrink-0 text-xs font-bold tabular-nums text-primary">
            {{ Math.round(highlight.percentOfTarget) }} %
          </span>
        </div>

        <p class="mt-2 text-sm text-muted">{{ reasons[highlight.key] }}</p>
      </li>
    </ul>
  </div>
</template>
