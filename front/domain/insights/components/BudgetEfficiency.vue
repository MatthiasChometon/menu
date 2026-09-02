<script setup lang="ts">
import type { BudgetHistoryPoint, RecipeValue } from '../composables/useBudgetEfficiency';
import type { Menu } from '../../menu/types/menu.type';

const { menu } = defineProps<{ menu: Menu | undefined }>();

const { menus } = useMenu();
const { costPer100gProteinOf, bestValueDishOf, historyOf } = useBudgetEfficiency();
const { nameOf } = useFoodFormat();
const localePath = useLocalePath();

const MAX_BAR_HEIGHT = 64;

const costPer100gProtein = computed((): number | undefined =>
  menu === undefined ? undefined : costPer100gProteinOf(menu),
);
const bestValueDish = computed((): RecipeValue | undefined =>
  menu === undefined ? undefined : bestValueDishOf(menu),
);
const history = computed((): BudgetHistoryPoint[] => historyOf(menus));
const maxPrice = computed((): number =>
  Math.max(1, ...history.value.map((point): number => point.totalPrice)),
);

const barHeightOf = (price: number): number =>
  Math.max(4, Math.round((price / maxPrice.value) * MAX_BAR_HEIGHT));
</script>

<template>
  <section class="rise rounded-2xl border border-default bg-elevated/40 p-4 sm:p-5">
    <h2 class="mb-1 text-lg font-semibold">{{ $t('insights.budget.title') }}</h2>
    <p class="mb-4 text-sm text-muted">{{ $t('insights.budget.lead') }}</p>

    <div
      v-if="menu === undefined"
      class="rounded-xl border border-dashed border-default p-6 text-center"
    >
      <UIcon name="i-lucide-euro" class="mx-auto size-8 text-dimmed" aria-hidden="true" />
      <p class="mt-3 text-sm text-muted">{{ $t('insights.budget.empty') }}</p>
      <UButton :to="localePath('/')" size="sm" variant="outline" color="neutral" class="mt-4">
        {{ $t('insights.budget.cta') }}
      </UButton>
    </div>

    <template v-else>
      <dl class="grid grid-cols-2 gap-3">
        <div class="rounded-xl bg-default p-3">
          <dt class="text-xs text-muted">{{ $t('insights.budget.costPerProtein') }}</dt>
          <dd class="mt-1 text-xl font-semibold tabular-nums">
            <span v-if="costPer100gProtein !== undefined"
              >{{ costPer100gProtein.toFixed(2) }} €</span
            >
            <span v-else class="text-dimmed">—</span>
          </dd>
        </div>

        <div class="rounded-xl bg-default p-3">
          <dt class="text-xs text-muted">{{ $t('insights.budget.bestValue') }}</dt>
          <dd v-if="bestValueDish !== undefined" class="mt-1">
            <span class="block text-sm font-semibold">{{ nameOf(bestValueDish.recipe) }}</span>
            <span class="text-xs text-muted tabular-nums">
              {{ Math.round(bestValueDish.proteinPerEuro) }}
              {{ $t('insights.budget.proteinPerEuro') }}
            </span>
          </dd>
          <dd v-else class="mt-1 text-sm text-dimmed">—</dd>
        </div>
      </dl>

      <div v-if="history.length >= 2" class="mt-4">
        <h3 class="mb-2 text-xs font-medium text-dimmed">{{ $t('insights.budget.evolution') }}</h3>
        <ul class="flex items-end gap-3">
          <li
            v-for="point in history"
            :key="point.weekOf"
            class="flex flex-1 flex-col items-center gap-1"
          >
            <span class="text-xs tabular-nums">{{ Math.round(point.totalPrice) }} €</span>
            <div class="flex h-16 w-full items-end justify-center rounded-md bg-elevated">
              <div
                class="w-full rounded-md bg-primary transition-[height] duration-700 ease-out"
                :style="{ height: `${barHeightOf(point.totalPrice)}px` }"
              />
            </div>
          </li>
        </ul>
      </div>
      <p v-else class="mt-4 text-xs text-dimmed">{{ $t('insights.budget.notEnoughHistory') }}</p>
    </template>
  </section>
</template>
