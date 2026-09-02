<script setup lang="ts">
import type { MonthlyCardData } from '../composables/useMonthlyRecapCard';
import type { MonthlyRecap } from '../composables/useMonthlyRecap';
import type { Menu } from '../../menu/types/menu.type';

const { history } = useAdherence(undefined);
const { entries } = useWeightLog();
const { menuOf } = useMenu();
const { recapOf } = useMonthlyRecap();
const { draw } = useMonthlyRecapCard();
const { download, shareCard, canShareFiles } = useWeekShareCard();
const { nameOf } = useFoodFormat();
const localePath = useLocalePath();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const colorMode = useColorMode();
const { t, locale } = useNuxtApp().$i18n;
const isSharing = ref(false);

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

const redraw = async (): Promise<void> => {
  if (canvasRef.value === null || recap.value === undefined) return;
  await draw(canvasRef.value, dataOf(recap.value));
};

onMounted(redraw);
watch([(): string => colorMode.value, locale, recap], redraw);

const filename = (): string => `menu-bilan-${new Date().toISOString().slice(0, 10)}.png`;

const onDownload = async (): Promise<void> => {
  if (canvasRef.value === null) return;
  await redraw();
  await download(canvasRef.value, filename());
};

const onShare = async (): Promise<void> => {
  if (canvasRef.value === null) return;
  isSharing.value = true;
  await redraw();
  await shareCard(canvasRef.value, filename());
  isSharing.value = false;
};
</script>

<template>
  <section class="rise rounded-2xl border border-default bg-elevated/40 p-4 sm:p-5">
    <h2 class="mb-1 text-lg font-semibold">{{ $t('insights.recap.title') }}</h2>
    <p class="mb-4 text-sm text-muted">{{ $t('insights.recap.lead') }}</p>

    <div
      v-if="recap === undefined"
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
        ref="canvasRef"
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
    </div>
  </section>
</template>
