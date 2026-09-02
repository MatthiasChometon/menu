<script setup lang="ts">
// The recap image itself: drawn on a canvas so it can be saved or shared as a
// picture, redrawn whenever the week, the language or the colour mode changes
// so what leaves the app always matches what is on screen.
const { menu } = defineProps<{ menu: Menu }>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const colorMode = useColorMode();
const { t, locale } = useNuxtApp().$i18n;
const { sumMacros } = useNutrition();
const { draw, download, shareCard } = useWeekShareCard();

const averageMacros = computed((): Macros => {
  if (menu.days.length === 0) return { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };

  const total = sumMacros(menu.days.map((day): Macros => day.macros));
  const count = menu.days.length;
  return {
    kcal: total.kcal / count,
    protein: total.protein / count,
    fat: total.fat / count,
    carbs: total.carbs / count,
    fiber: total.fiber / count,
  };
});

const weekLabel = computed((): string =>
  new Date(`${menu.weekOf}T00:00:00`).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
);

const dataOf = (): WeekShareData => ({
  wordmark: t('menu.brand'),
  weekLabel: `${t('weekShare.weekOf')} ${weekLabel.value}`,
  avgKcal: averageMacros.value.kcal,
  kcalUnitLabel: t('menu.unit.kcal'),
  avgMacros: averageMacros.value,
  macroLabels: {
    protein: t('menu.macroShort.protein'),
    carbs: t('menu.macroShort.carbs'),
    fat: t('menu.macroShort.fat'),
  },
  totalPrice: menu.totalPrice,
  budgetLabel: t('menu.budget'),
  recipeCount: menu.recipes.length,
  recipesLabel: t('menu.recipeCount'),
  footer: t('weekShare.footer'),
});

const redraw = async (): Promise<void> => {
  if (canvasRef.value === null) return;
  await draw(canvasRef.value, dataOf());
};

onMounted(redraw);
watch([(): string => colorMode.value, locale, (): string => menu.weekOf], redraw);

const filename = (): string => `menu-${menu.weekOf}.png`;

defineExpose({
  download: async (): Promise<void> => {
    if (canvasRef.value === null) return;
    await redraw();
    await download(canvasRef.value, filename());
  },
  shareCard: async (): Promise<boolean> => {
    if (canvasRef.value === null) return false;
    await redraw();
    return shareCard(canvasRef.value, filename());
  },
});
</script>

<template>
  <canvas
    ref="canvasRef"
    width="1080"
    height="1350"
    class="w-full max-w-xs rounded-3xl border border-default shadow-sm"
    role="img"
    :aria-label="$t('weekShare.cardAlt')"
  />
</template>
