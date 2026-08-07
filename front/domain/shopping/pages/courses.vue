<script setup lang="ts">
const { selectedWeek, selectedMenu: currentMenu } = useSelectedWeek();
const { groupsOf } = useShoppingGroups();
const { t } = useNuxtApp().$i18n;
const localePath = useLocalePath();
const isMounted = useMounted();

const { pickedIds, toggle, clear } = useShoppingCart(selectedWeek);

const groups = computed((): ShoppingGroup[] =>
  currentMenu.value === undefined ? [] : groupsOf(currentMenu.value),
);

const freshSeasonings = computed((): Seasoning[] => currentMenu.value?.freshSeasonings ?? []);

// The aromatics count towards the progress too: the basket is not done while
// the garlic is still on the shelf.
const totalLines = computed(
  (): number => (currentMenu.value?.shoppingList.length ?? 0) + freshSeasonings.value.length,
);

// Ticks only apply once mounted: the prerendered HTML knows nothing about
// localStorage, and rendering them server-side would break hydration.
const visiblePickedIds = computed((): string[] => (isMounted.value ? pickedIds.value : []));

const isComplete = computed(
  (): boolean => totalLines.value > 0 && visiblePickedIds.value.length === totalLines.value,
);

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

    <div
      v-if="currentMenu === undefined"
      class="flex flex-col items-center gap-3 py-20 text-center"
    >
      <UIcon name="i-lucide-shopping-basket" class="size-12 text-dimmed" />
      <h1 class="text-xl font-bold">{{ $t('shopping.empty.title') }}</h1>
      <p class="max-w-sm text-muted">{{ $t('shopping.empty.hint') }}</p>
    </div>

    <template v-else>
      <header class="rise">
        <h1 class="text-3xl font-black tracking-tight">{{ $t('shopping.title') }}</h1>
        <p class="mt-1 text-muted">{{ $t('shopping.lead') }}</p>
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
              {{ visiblePickedIds.length }} / {{ totalLines }} {{ $t('shopping.progress') }}
            </p>
            <p class="text-xl font-black tabular-nums">
              {{ Math.round(currentMenu.totalPrice) }} €
              <span class="text-xs font-medium text-dimmed">{{ $t('shopping.total') }}</span>
            </p>
          </div>
          <UButton
            v-if="visiblePickedIds.length > 0"
            icon="i-lucide-rotate-ccw"
            variant="ghost"
            color="neutral"
            size="sm"
            @click="isResetOpen = true"
          >
            {{ $t('shopping.reset') }}
          </UButton>
        </div>
        <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-elevated">
          <div
            class="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            :style="{
              width: `${totalLines === 0 ? 0 : (visiblePickedIds.length / totalLines) * 100}%`,
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

      <div class="mt-6 space-y-7">
        <ShoppingAisle
          v-for="(group, index) in groups"
          :key="group.aisle"
          :group="group"
          :picked-ids="visiblePickedIds"
          :index="index"
          @toggle="toggle"
        />
        <ShoppingSeasoningAisle
          v-if="freshSeasonings.length > 0"
          :seasonings="freshSeasonings"
          :picked-ids="visiblePickedIds"
          :index="groups.length"
          @toggle="toggle"
        />
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
