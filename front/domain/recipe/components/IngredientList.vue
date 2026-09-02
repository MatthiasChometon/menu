<script setup lang="ts">
const { quantities } = defineProps<{ quantities: SharedQuantity[] }>();

const { imageOf } = useFoods();
const { nameOf, quantityLabel, pieceLabel, round } = useFoodFormat();
const { substitutesFor, gramsEquivalentTo } = useFoodSubstitutes();

const MACRO_COMPARE_KEYS = ['protein', 'carbs', 'fat'] as const;

const opened = ref(new Set<string>());
const substituting = ref(new Set<string>());

// Only worth splitting when there is something to split. With one person at the
// table the total IS their portion, and a fold showing a single line repeating
// the number above it is noise dressed up as information.
const isShared = (quantity: SharedQuantity): boolean => quantity.perEater.length > 1;

const toggle = (id: string): void => {
  const next = new Set(opened.value);
  if (!next.delete(id)) next.add(id);
  opened.value = next;
};

const toggleSubstitute = (id: string): void => {
  const next = new Set(substituting.value);
  if (!next.delete(id)) next.add(id);
  substituting.value = next;
};

const macroValueLabel = (value: number): string => `${round(value)} g`;
</script>

<template>
  <ul class="grid gap-2 sm:grid-cols-2">
    <li
      v-for="quantity in quantities"
      :key="quantity.food.id"
      class="rounded-2xl border border-default bg-elevated/30 p-2.5"
    >
      <div class="flex items-center gap-3">
        <div class="size-12 shrink-0 overflow-hidden rounded-lg">
          <UiThumb
            :src="imageOf(quantity.food)"
            :alt="nameOf(quantity.food)"
            :icon="quantity.food.icon"
            rounded="rounded-lg"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ nameOf(quantity.food) }}</p>
          <p
            v-if="pieceLabel(quantity.food, quantity.total) !== undefined"
            class="text-xs text-muted"
          >
            ≈ {{ pieceLabel(quantity.food, quantity.total) }}
          </p>

          <div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <!-- The fold, not a second column: a phone held over a pan has room
                 for one number, and the others are only wanted at serving time. -->
            <button
              v-if="isShared(quantity)"
              type="button"
              class="flex items-center gap-1 text-xs text-muted transition-colors hover:text-default"
              :aria-expanded="opened.has(quantity.food.id)"
              :aria-controls="`shares-${quantity.food.id}`"
              @click="toggle(quantity.food.id)"
            >
              <UIcon
                name="i-lucide-chevron-right"
                class="size-3.5 transition-transform duration-200"
                :class="opened.has(quantity.food.id) && 'rotate-90'"
              />
              {{ $t('recipe.perPerson') }}
            </button>

            <button
              type="button"
              class="flex items-center gap-1 text-xs text-muted transition-colors hover:text-default"
              :aria-expanded="substituting.has(quantity.food.id)"
              :aria-controls="`substitutes-${quantity.food.id}`"
              @click="toggleSubstitute(quantity.food.id)"
            >
              <UIcon name="i-lucide-shuffle" class="size-3.5 shrink-0" aria-hidden="true" />
              {{ $t('recipe.substitute.action') }}
            </button>
          </div>
        </div>
        <span class="shrink-0 font-bold tabular-nums">
          {{ quantityLabel(quantity.food, quantity.total) }}
        </span>
      </div>

      <dl
        v-if="isShared(quantity) && opened.has(quantity.food.id)"
        :id="`shares-${quantity.food.id}`"
        class="mt-2 space-y-1 border-t border-default pt-2 pl-15"
      >
        <div v-for="share in quantity.perEater" :key="share.eater.id" class="flex items-baseline">
          <dt class="min-w-0 flex-1 truncate text-xs text-muted">{{ share.eater.name }}</dt>
          <dd class="shrink-0 text-xs font-semibold tabular-nums">
            {{ quantityLabel(quantity.food, share.grams) }}
          </dd>
        </div>
      </dl>

      <!-- Read-only, on purpose: this dépanne one weighing, it never rewrites
           the recipe or recomputes the week's targets. -->
      <div
        v-if="substituting.has(quantity.food.id)"
        :id="`substitutes-${quantity.food.id}`"
        class="mt-2 space-y-2 border-t border-default pt-2"
      >
        <p class="text-xs text-muted">{{ $t('recipe.substitute.hint') }}</p>

        <ul v-if="substitutesFor(quantity.food).length > 0" class="space-y-1.5">
          <li
            v-for="alt in substitutesFor(quantity.food)"
            :key="alt.id"
            class="rounded-xl bg-elevated/50 p-2"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="min-w-0 flex-1 truncate text-xs font-semibold">{{ nameOf(alt) }}</span>
              <span class="shrink-0 text-xs font-bold tabular-nums text-primary">
                ≈ {{ quantityLabel(alt, gramsEquivalentTo(quantity.food, quantity.total, alt)) }}
              </span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-dimmed">
              <span v-for="key in MACRO_COMPARE_KEYS" :key="key" class="flex items-center gap-1">
                <span
                  class="size-1.5 shrink-0 rounded-full"
                  :style="{ backgroundColor: `var(--macro-${key})` }"
                  aria-hidden="true"
                />
                {{ $t(`menu.macroShort.${key}`) }} {{ macroValueLabel(alt[key]) }}
              </span>
            </div>
          </li>
        </ul>
        <p v-else class="text-xs text-dimmed">{{ $t('recipe.substitute.none') }}</p>
      </div>
    </li>
  </ul>
</template>
