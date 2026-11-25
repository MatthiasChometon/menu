<script setup lang="ts">
import type { MonthlyCardData } from '../composables/useMonthlyRecapCard';
import type { MonthlyRecap } from '../composables/useMonthlyRecap';
import type { Menu } from '../../menu/types/menu.type';

const { history, hasFailed: hasHistoryFailed, dismissFailure } = useAdherence(undefined);
const { entries, hasFailed: hasEntriesFailed, refresh: refreshEntries } = useWeightLog();
const { menuOf } = useMenu();
const { recapOf } = useMonthlyRecap();
const { draw, downloadOrFail, shareOrFail, canShareFiles } = useMonthlyRecapCard();
const { nameOf } = useFoodFormat();
const localePath = useLocalePath();

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas');
const colorMode = useColorMode();
const { t, locale } = useNuxtApp().$i18n;
const isSharing = ref(false);

// A card that could not be drawn or turned into an image is said out loud: a
// button that does nothing reads as a broken page.
const { hasFailed, run } = useAttempt('insights.recap.export');

const eatenCountOf = (weekOf: string, menu: Menu, recipeId: string): number =>
  useCookingLog(weekOf).eatenCountOf(menu, recipeId);

const recap = computed((): MonthlyRecap | undefined =>
  recapOf(history.value, entries.value, menuOf, eatenCountOf),
);

const weightValueOf = (current: MonthlyRecap): string =>
  current.weightGainedKg === undefined
    ? '—'
    : `${current.weightGainedKg > 0 ? '+' : ''}${current.weightGainedKg.toFixed(1)} kg`;

const budgetValueOf = (current: MonthlyRecap): string =>
  current.averageBudget === undefined ? '—' : `${Math.round(current.averageBudget)} €`;

const dataOf = (current: MonthlyRecap): MonthlyCardData => ({
  wordmark: t('menu.brand'),
  title: t('insights.recap.cardTitle'),
  weightLabel: t('insights.recap.weight'),
  weightValue: weightValueOf(current),
  adherenceLabel: t('insights.recap.adherence'),
  adherenceValue: `${Math.round(current.averageAdherenceRate * 100)}%`,
  budgetLabel: t('insights.recap.budget'),
  budgetValue: budgetValueOf(current),
  dishesLabel: t('insights.recap.dishes'),
  dishNames: current.favoriteDishes.map((recipe): string => nameOf(recipe)),
  footer: t('insights.recap.footer'),
});

const drawCard = async (): Promise<void> => {
  if (canvasRef.value === null || recap.value === undefined) return;
  await draw(canvasRef.value, dataOf(recap.value));
};

const redraw = (): Promise<void> => run(drawCard);

onMounted(redraw);
watch([(): string => colorMode.value, locale, recap], redraw);

// The day the file is saved, on the Paris calendar: the UTC day would name a
// card made after midnight in Paris with yesterday's date.
const filename = (): string => `menu-bilan-${startOf(new Date())}.png`;

const onDownload = (): Promise<void> =>
  run(async (): Promise<void> => {
    if (canvasRef.value === null) return;
    await drawCard();
    await downloadOrFail(canvasRef.value, filename());
  });

const onShare = async (): Promise<void> => {
  isSharing.value = true;
  try {
    await run(async (): Promise<void> => {
      if (canvasRef.value === null) return;
      await drawCard();
      await shareOrFail(canvasRef.value, filename());
    });
  } finally {
    isSharing.value = false;
  }
};
</script>

<template>
  <section class="rise rounded-2xl border border-default bg-elevated/40 p-4 sm:p-5">
    <h2 class="mb-1 text-lg font-semibold">{{ $t('insights.recap.title') }}</h2>
    <p class="mb-4 text-sm text-muted">{{ $t('insights.recap.lead') }}</p>

    <!-- Not the empty invitation: "not enough data" would be wrong to tell
         somebody whose weigh-ins are merely not loaded. -->
    <UAlert
      v-if="hasEntriesFailed"
      role="alert"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="$t('insights.recap.loadFailed')"
    >
      <template #actions>
        <UButton color="error" variant="subtle" @click="refreshEntries">
          {{ $t('insights.recap.retry') }}
        </UButton>
      </template>
    </UAlert>

    <UAlert
      v-else-if="hasHistoryFailed"
      role="alert"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="$t('insights.recap.historyFailed')"
    >
      <template #actions>
        <UButton color="error" variant="subtle" @click="dismissFailure">
          {{ $t('insights.recap.dismiss') }}
        </UButton>
      </template>
    </UAlert>

    <div
      v-else-if="recap === undefined"
      class="rounded-xl border border-dashed border-default p-6 text-center"
    >
      <UIcon name="i-lucide-image" class="mx-auto size-8 text-dimmed" aria-hidden="true" />
      <p class="mt-3 text-sm text-muted">{{ $t('insights.recap.empty') }}</p>
      <div class="mt-4 flex flex-wrap justify-center gap-2">
        <UButton :to="localePath('/poids')" size="sm" variant="outline" color="neutral">
          {{ $t('insights.recap.ctaWeight') }}
        </UButton>
        <UButton :to="localePath('/')" size="sm" variant="outline" color="neutral">
          {{ $t('insights.recap.ctaWeek') }}
        </UButton>
      </div>
    </div>

    <div v-else class="flex flex-col items-center gap-4">
      <canvas
        ref="canvas"
        width="1080"
        height="1350"
        class="w-full max-w-xs rounded-3xl border border-default shadow-sm"
        role="img"
        :aria-label="$t('insights.recap.cardAlt')"
      />

      <div class="flex flex-wrap justify-center gap-2">
        <UButton icon="i-lucide-download" variant="outline" color="neutral" @click="onDownload">
          {{ $t('insights.recap.download') }}
        </UButton>
        <ClientOnly>
          <UButton
            v-if="canShareFiles()"
            icon="i-lucide-share-2"
            :loading="isSharing"
            class="text-white"
            @click="onShare"
          >
            {{ $t('insights.recap.share') }}
          </UButton>
        </ClientOnly>
      </div>

      <p v-if="hasFailed" role="alert" class="text-center text-sm text-error">
        {{ $t('insights.recap.failed') }}
      </p>
    </div>
  </section>
</template>
