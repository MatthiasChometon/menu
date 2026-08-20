<script setup lang="ts">
const { quantities } = defineProps<{ quantities: SharedQuantity[] }>();

const { imageOf } = useFoods();
const { nameOf, quantityLabel, pieceLabel } = useFoodFormat();

const opened = ref(new Set<string>());

// Only worth splitting when there is something to split. With one person at the
// table the total IS their portion, and a fold showing a single line repeating
// the number above it is noise dressed up as information.
const isShared = (quantity: SharedQuantity): boolean => quantity.perEater.length > 1;

const toggle = (id: string): void => {
  const next = new Set(opened.value);
  if (!next.delete(id)) next.add(id);
  opened.value = next;
};
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

          <!-- The fold, not a second column: a phone held over a pan has room
               for one number, and the others are only wanted at serving time. -->
          <button
            v-if="isShared(quantity)"
            type="button"
            class="mt-0.5 flex items-center gap-1 text-xs text-muted transition-colors hover:text-default"
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
    </li>
  </ul>
</template>
