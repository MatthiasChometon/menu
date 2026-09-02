<script setup lang="ts">
const { selectedWeek, selectedMenu: currentMenu, isLoading } = useSelectedWeek();
const { groupsOf } = useShoppingGroups();
const { eaters, isLoading: isLoadingEaters, isUnscaled, linesFor } = useShoppingQuantities();
const { t } = useNuxtApp().$i18n;
const localePath = useLocalePath();
const isMounted = useMounted();

const { pickedIds, toggle, clear } = useShoppingCart(selectedWeek);
const { user } = useAuth();

// Scaled for everyone who eats it before being grouped: the aisles and the
// totals both have to speak of the same basket.
const householdMenu = computed((): Menu | undefined =>
  currentMenu.value === undefined
    ? undefined
    : { ...currentMenu.value, shoppingList: linesFor(currentMenu.value) },
);

const groups = computed((): ShoppingGroup[] =>
  householdMenu.value === undefined ? [] : groupsOf(householdMenu.value),
);

const freshSeasonings = computed((): Seasoning[] => currentMenu.value?.freshSeasonings ?? []);

// What is already at home steps out of the active list, the total and the
// count below — the shelf keeps it, out of the way but one tap from coming back.
const {
  toggle: togglePantry,
  activeGroups,
  activeSeasonings,
  pantryEntries,
} = useShoppingPantry(groups, freshSeasonings);

const activeIds = computed((): string[] => [
  ...activeGroups.value.flatMap((group): string[] =>
    group.lines.map((line): string => line.food.id),
  ),
  ...activeSeasonings.value.map((seasoning): string => seasoning.id),
]);

// The aromatics count towards the progress too: the basket is not done while
// the garlic is still on the shelf. What is already in the pantry does not.
const totalLines = computed((): number => activeIds.value.length);

// Ticks only apply once mounted: the prerendered HTML knows nothing about
// localStorage, and rendering them server-side would break hydration.
const visiblePickedIds = computed((): string[] => (isMounted.value ? pickedIds.value : []));
const visiblePickedCount = computed(
  (): number => visiblePickedIds.value.filter((id): boolean => activeIds.value.includes(id)).length,
);

const isComplete = computed(
  (): boolean => totalLines.value > 0 && visiblePickedCount.value === totalLines.value,
);

// What is left to buy, priced: the pantry has already been subtracted from
// every group above, so summing them back up is the whole story.
const remainingTotal = computed((): number =>
  activeGroups.value.reduce((total, group): number => total + group.price, 0),
);

const { isSharing, shareList } = useShoppingShare();
const shareCurrentList = async (): Promise<void> => {
  await shareList({ groups: activeGroups.value, seasonings: activeSeasonings.value });
};

const isResetOpen = ref(false);

const confirmReset = (): void => {
  clear();
  isResetOpen.value = false;
};

useSeoMeta({ title: (): string => t('shopping.title') });
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <UButton
      :to="localePath('/')"
      icon="i-lucide-arrow-left"
      variant="ghost"
      color="neutral"
      class="mb-4"
    >
      {{ $t('shopping.backToWeek') }}
    </UButton>

    <!-- While a signed-in week is loading, hold the space with a skeleton rather
         than flash the empty state before the list arrives. -->
    <div v-if="isLoading" class="space-y-4 py-8" aria-hidden="true">
      <USkeleton class="h-24 rounded-2xl" />
      <USkeleton class="h-40 rounded-2xl" />
      <USkeleton class="h-40 rounded-2xl" />
    </div>
    <span v-if="isLoading" class="sr-only">{{ $t('accessibility.loading') }}</span>

    <div
      v-else-if="currentMenu === undefined"
      class="flex flex-col items-center gap-3 py-20 text-center"
    >
      <UIcon name="i-lucide-shopping-basket" class="size-12 text-dimmed" />
      <h1 class="text-xl font-bold">{{ $t('shopping.empty.title') }}</h1>
      <p class="max-w-sm text-muted">{{ $t('shopping.empty.hint') }}</p>
    </div>

    <template v-else>
      <header class="rise">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="font-serif text-4xl tracking-tight">{{ $t('shopping.title') }}</h1>
            <p class="mt-1 text-muted">{{ $t('shopping.lead') }}</p>
          </div>
          <ShoppingOnlineBadge v-if="isMounted" />
        </div>
        <!-- The basket is per week: without saying which, a list built for next
             week reads as a mistake in this one. -->
        <MenuWeekPicker class="mt-3" />
      </header>

      <div
        class="rise sticky top-[4.25rem] z-30 mt-4 rounded-2xl border border-default bg-default/90 p-4 backdrop-blur-lg"
        style="animation-delay: 60ms"
      >
        <div class="flex items-center justify-between gap-4">
          <div class="min-w-0">
            <p class="text-sm tabular-nums text-muted">
              {{ visiblePickedCount }} / {{ totalLines }} {{ $t('shopping.progress') }}
            </p>
            <p class="text-xl font-black tabular-nums">
              {{ Math.round(remainingTotal) }} €
              <span class="text-xs font-medium text-dimmed">{{ $t('shopping.total') }}</span>
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <UButton
              v-if="totalLines > 0"
              icon="i-lucide-share-2"
              variant="ghost"
              color="neutral"
              size="sm"
              :loading="isSharing"
              @click="shareCurrentList"
            >
              {{ $t('shopping.share.button') }}
            </UButton>
            <UButton
              v-if="visiblePickedCount > 0"
              icon="i-lucide-rotate-ccw"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="isResetOpen = true"
            >
              {{ $t('shopping.reset') }}
            </UButton>
          </div>
        </div>
        <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-elevated">
          <div
            class="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            :style="{
              width: `${totalLines === 0 ? 0 : (visiblePickedCount / totalLines) * 100}%`,
            }"
          />
        </div>
      </div>

      <UAlert
        v-if="isComplete"
        class="rise mt-4"
        color="primary"
        variant="subtle"
        icon="i-lucide-party-popper"
        :title="$t('shopping.done')"
        :description="$t('shopping.doneHint')"
      />

      <USkeleton v-if="!isMounted || isLoadingEaters" class="mt-3 h-5 w-56" />
      <!-- The household never came back — no signal at the back of a shop is
           the usual reason. The list is still the menu's, so it is worth
           reading; what it is not is weighed for this household, and that has
           to be said rather than left to be discovered at the till. -->
      <p v-else-if="isUnscaled" class="mt-3 flex items-center gap-1.5 text-sm text-warning">
        <UIcon name="i-lucide-wifi-off" class="size-4 shrink-0" />
        {{ $t('shopping.unscaled') }}
      </p>
      <p v-else-if="eaters.length > 0" class="mt-3 text-sm text-muted">
        {{ $t('shopping.forHousehold') }}
        <span class="font-semibold">
          {{
            eaters.length > 1
              ? `${eaters.length} ${$t('shopping.people')}`
              : $t('shopping.onePerson')
          }}
        </span>
      </p>

      <USkeleton v-if="!isMounted" class="mt-6 h-32 rounded-xl" />
      <OrderButton v-else-if="user && currentMenu" class="mt-6" :menu="currentMenu" />

      <!-- Also before mount: the prerendered HTML knows nothing of the
           household, so it lists the menu's own grammes. Rendering them and
           then swapping them for a skeleton made the whole list appear,
           vanish and come back — and the numbers in between were for one
           person in a house of three. -->
      <div v-if="!isMounted || isLoadingEaters" class="mt-6 space-y-4">
        <USkeleton v-for="row in 4" :key="row" class="h-24 rounded-xl" />
        <span class="sr-only">{{ $t('accessibility.loading') }}</span>
      </div>

      <div v-else class="mt-6 space-y-7">
        <ShoppingAisle
          v-for="(group, index) in activeGroups"
          :key="group.aisle"
          :group="group"
          :picked-ids="visiblePickedIds"
          :index="index"
          @toggle="toggle"
          @pantry="togglePantry"
        />
        <ShoppingSeasoningAisle
          v-if="activeSeasonings.length > 0"
          :seasonings="activeSeasonings"
          :picked-ids="visiblePickedIds"
          :index="activeGroups.length"
          @toggle="toggle"
          @pantry="togglePantry"
        />
        <ShoppingPantrySection :entries="pantryEntries" @remove="togglePantry" />
      </div>

      <UModal v-model:open="isResetOpen" :title="$t('shopping.resetTitle')">
        <template #body>
          <p class="text-muted">{{ $t('shopping.resetHint') }}</p>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="isResetOpen = false">
              {{ $t('shopping.cancel') }}
            </UButton>
            <UButton color="error" class="text-white" @click="confirmReset">
              {{ $t('shopping.confirm') }}
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </div>
</template>
