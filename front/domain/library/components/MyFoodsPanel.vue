<script setup lang="ts">
import type { CustomFood } from '../../customCatalog/types/customCatalog.type';

const { foods, remove } = useMyFoods();
const { t } = useNuxtApp().$i18n;

const editing = ref<CustomFood>();
const isCreateOpen = ref(false);
const isEditOpen = ref(false);
const removing = ref<string>();
const hasFailed = ref(false);

const openEdit = (food: CustomFood): void => {
  editing.value = food;
  isEditOpen.value = true;
};

const confirmRemoval = async (id: string): Promise<void> => {
  removing.value = undefined;
  hasFailed.value = false;

  try {
    await remove(id);
  } catch {
    hasFailed.value = true;
  }
};
</script>

<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-lg font-semibold">{{ t('library.myFoods.title') }}</h2>
      <UButton icon="i-lucide-plus" size="sm" variant="soft" @click="isCreateOpen = true">
        {{ t('library.myFoods.create') }}
      </UButton>
    </div>

    <p v-if="foods.length === 0" class="text-sm text-muted">{{ t('library.myFoods.empty') }}</p>

    <ul v-else class="grid gap-2 sm:grid-cols-2">
      <li
        v-for="food in foods"
        :key="food.id"
        class="rounded-xl border border-default bg-elevated/40 px-3 py-2"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="truncate text-sm font-medium">{{ food.name }}</p>
            <p class="text-xs tabular-nums text-muted">
              {{ t('library.myFoods.kcalPer100g', { kcal: Math.round(food.kcal) }) }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <UButton
              icon="i-lucide-pencil"
              variant="ghost"
              color="neutral"
              size="xs"
              :aria-label="t('library.myFoods.edit', { name: food.name })"
              @click="openEdit(food)"
            />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="xs"
              :aria-label="t('library.myFoods.remove', { name: food.name })"
              @click="removing = food.id"
            />
          </div>
        </div>

        <!-- Asked in place rather than in a dialog: the food being removed
             stays on screen, above the button that removes it. -->
        <div
          v-if="removing === food.id"
          class="mt-2 flex items-center gap-2 border-t border-default pt-2"
        >
          <p class="text-xs">{{ t('library.myFoods.removeConfirm') }}</p>
          <div class="ml-auto flex gap-1">
            <UButton size="xs" color="neutral" variant="ghost" @click="removing = undefined">
              {{ t('library.myFoods.cancel') }}
            </UButton>
            <UButton size="xs" color="error" @click="confirmRemoval(food.id)">
              {{ t('library.myFoods.removeYes') }}
            </UButton>
          </div>
        </div>
      </li>
    </ul>

    <UAlert
      v-if="hasFailed"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="t('library.myFoods.removeFailed')"
    />

    <LibraryFoodFormDialog v-model="isCreateOpen" />
    <LibraryFoodFormDialog v-model="isEditOpen" :food="editing" />
  </section>
</template>
