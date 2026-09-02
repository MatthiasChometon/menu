<script setup lang="ts">
import type { ChartDomain, ChartPoint, ChartRange } from '../composables/useWeightChart';
import type { TargetPoint, TrendPoint } from '../composables/useWeightTrend';

// Three layers, weakest signal first: the raw weigh-ins (noisy, day to day),
// the moving average on top of them (what the diary is actually trending
// towards), and the target corridor behind both (what "on pace" would have
// looked like from the very first weigh-in).
const { entries } = useWeightLog();
const { chronological, movingAverageOf, targetBandOf } = useWeightTrend();
const { viewBox, scaleXOf, rangeOf, scaleYOf, pathOf, lengthOf, bandPolygonOf } = useWeightChart();
const { t, locale } = useNuxtApp().$i18n;

const MARGIN_LEFT = 34;
const MARGIN_TOP = 10;
const MARGIN_BOTTOM = 22;

const ordered = computed((): WeightEntry[] => chronological(entries.value));
const hasTrend = computed((): boolean => ordered.value.length >= 2);

const domain = computed((): ChartDomain => {
  const first = ordered.value[0];
  const last = ordered.value.at(-1) ?? first;

  return { minDate: first?.date ?? '', maxDate: last?.date ?? '' };
});

const trend = computed((): TrendPoint[] => movingAverageOf(ordered.value));
const band = computed((): TargetPoint[] => targetBandOf(ordered.value));

const range = computed((): ChartRange =>
  rangeOf([
    ...ordered.value.map((entry): number => entry.kg),
    ...band.value.flatMap((point): number[] => [point.minKg, point.maxKg]),
  ]),
);

const pointOf = (date: string, kg: number): ChartPoint => ({
  x: scaleXOf(date, domain.value),
  y: scaleYOf(kg, range.value),
});

const rawPoints = computed((): ChartPoint[] =>
  ordered.value.map((entry): ChartPoint => pointOf(entry.date, entry.kg)),
);
const trendPoints = computed((): ChartPoint[] =>
  trend.value.map((point): ChartPoint => pointOf(point.date, point.kg)),
);
const bandTop = computed((): ChartPoint[] =>
  band.value.map((point): ChartPoint => pointOf(point.date, point.maxKg)),
);
const bandBottom = computed((): ChartPoint[] =>
  band.value.map((point): ChartPoint => pointOf(point.date, point.minKg)),
);

const trendPath = computed((): string => pathOf(trendPoints.value));
const trendLength = computed((): number => Math.max(1, lengthOf(trendPoints.value)));
const bandPolygon = computed((): string => bandPolygonOf(bandTop.value, bandBottom.value));

const yTicks = computed((): { y: number; label: string }[] => {
  const { min, max } = range.value;

  return [max, (min + max) / 2, min].map((kg): { y: number; label: string } => ({
    y: scaleYOf(kg, range.value),
    label: kg.toFixed(1),
  }));
});

const shortDateOf = (date: string): string =>
  new Date(`${date}T00:00:00`).toLocaleDateString(locale.value, { day: 'numeric', month: 'short' });

type XTick = { x: number; label: string; anchor: 'start' | 'middle' | 'end' };

// Anchored outward at each end rather than centred on the point: a centred
// label at x=0 or x=width spills half its width past the frame, which is
// exactly what clipped the last date before this.
const xTicks = computed((): XTick[] => {
  const first = ordered.value[0];
  const last = ordered.value.at(-1);
  if (first === undefined || last === undefined) return [];
  if (first.date === last.date)
    return [{ x: scaleXOf(first.date, domain.value), label: shortDateOf(first.date), anchor: 'middle' }];

  return [
    { x: scaleXOf(first.date, domain.value), label: shortDateOf(first.date), anchor: 'start' },
    { x: scaleXOf(last.date, domain.value), label: shortDateOf(last.date), anchor: 'end' },
  ];
});

const chartLabel = computed((): string => {
  const first = ordered.value[0];
  const last = ordered.value.at(-1);
  if (first === undefined || last === undefined) return t('weight.chart.title');

  return `${t('weight.chart.title')} — ${shortDateOf(first.date)} → ${shortDateOf(last.date)}`;
});
</script>

<template>
  <div class="rise rounded-2xl border border-default bg-elevated/40 p-4 sm:p-5">
    <h2 class="mb-1 text-lg font-semibold">{{ $t('weight.chart.title') }}</h2>

    <p v-if="!hasTrend" class="py-6 text-center text-sm text-muted">
      {{ $t('weight.chart.notEnoughData') }}
    </p>

    <template v-else>
      <svg
        :viewBox="`0 0 ${MARGIN_LEFT + viewBox.width} ${MARGIN_TOP + viewBox.height + MARGIN_BOTTOM}`"
        role="img"
        :aria-label="chartLabel"
        class="w-full"
      >
        <g :transform="`translate(${MARGIN_LEFT}, ${MARGIN_TOP})`">
          <line
            v-for="tick in yTicks"
            :key="`grid-${tick.y}`"
            x1="0"
            :x2="viewBox.width"
            :y1="tick.y"
            :y2="tick.y"
            class="stroke-default"
            stroke-width="1"
          />

          <polygon v-if="bandPolygon !== ''" :points="bandPolygon" class="fill-warning/15" />

          <polyline
            v-if="rawPoints.length > 1"
            :points="rawPoints.map((point) => `${point.x},${point.y}`).join(' ')"
            fill="none"
            class="stroke-muted"
            stroke-width="1.5"
            opacity="0.6"
          />
          <circle
            v-for="(point, index) in rawPoints"
            :key="`raw-${index}`"
            :cx="point.x"
            :cy="point.y"
            r="2.5"
            class="fill-default stroke-muted"
            stroke-width="1.5"
          />

          <path
            :d="trendPath"
            fill="none"
            class="trend-line stroke-primary"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            :style="{ '--trend-length': `${trendLength}px` }"
          />
        </g>

        <text
          v-for="tick in yTicks"
          :key="`y-label-${tick.y}`"
          :x="MARGIN_LEFT - 6"
          :y="MARGIN_TOP + tick.y"
          text-anchor="end"
          dominant-baseline="middle"
          class="fill-muted tabular-nums"
          font-size="9"
        >
          {{ tick.label }}
        </text>

        <text
          v-for="tick in xTicks"
          :key="`x-label-${tick.x}`"
          :x="MARGIN_LEFT + tick.x"
          :y="MARGIN_TOP + viewBox.height + 16"
          :text-anchor="tick.anchor"
          class="fill-muted"
          font-size="9"
        >
          {{ tick.label }}
        </text>
      </svg>

      <dl class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        <div class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-full border border-muted bg-default" aria-hidden="true" />
          <dt>{{ $t('weight.chart.rawLabel') }}</dt>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="h-0.5 w-3 rounded-full bg-primary" aria-hidden="true" />
          <dt>{{ $t('weight.chart.trendLabel') }}</dt>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-full bg-warning/40" aria-hidden="true" />
          <dt>{{ $t('weight.chart.targetLabel') }}</dt>
        </div>
      </dl>
    </template>
  </div>
</template>

<style scoped>
.trend-line {
  stroke-dasharray: var(--trend-length);
  stroke-dashoffset: 0;
}

@media (prefers-reduced-motion: no-preference) {
  .trend-line {
    stroke-dashoffset: var(--trend-length);
    animation: trend-draw 1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  @keyframes trend-draw {
    to {
      stroke-dashoffset: 0;
    }
  }
}
</style>
