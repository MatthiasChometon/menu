<script setup lang="ts">
const { entry } = defineProps<{ entry: LibraryEntry }>();
const emit = defineEmits<{ edit: [id: string] }>();

const localePath = useLocalePath();
const { nameOf } = useFoodFormat();
const { imageOf } = useRecipes();
const { recipes: myRecipes, remove } = useMyRecipes();

const isSeasonal = computed((): boolean => entry.seasonalIngredientIds.length > 0);

// Only a reader's own recipe carries these controls: the site catalogue has
// no owner to edit or remove it on behalf of.
const isMine = computed((): boolean =>
  myRecipes.value.some((recipe): boolean => recipe.id === entry.recipe.id),
);

const isConfirmingRemoval = ref(false);
const isRemoving = ref(false);

const confirmRemoval = async (): Promise<void> => {
  isRemoving.value = true;
  try {
    await remove(entry.recipe.id);
  } finally {
    isRemoving.value = false;
    isConfirmingRemoval.value = false;
  }
};
</script>

<template>
  <!-- Relatively positioned so the owner's own controls can sit above the
       card's own link rather than inside it: a button nested in an anchor is
       invalid HTML, so they are siblings instead, stacked with z-index. -->
  <div class="group relative overflow-hidden rounded-2xl border border-default bg-default">
    <NuxtLink
      :to="localePath(`/recette/${entry.recipe.id}`)"
      class="block transition-shadow hover:shadow-md focus-visible:shadow-md"
    >
      <div class="aspect-[4/3] overflow-hidden">
        <UiThumb
          :src="imageOf(entry.recipe)"
          :alt="nameOf(entry.recipe)"
          icon="i-lucide-cooking-pot"
          rounded="rounded-none"
          class="transform-gpu transition-transform duration-500 will-change-transform group-hover:scale-105"
        />
      </div>

      <div class="space-y-2 p-4">
        <p class="truncate font-semibold">{{ nameOf(entry.recipe) }}</p>

        <div class="flex flex-wrap items-center gap-2">
          <UBadge color="neutral" variant="subtle" size="sm" icon="i-lucide-timer">
            {{ entry.recipe.prepMinutes }} {{ $t('recipe.minutes') }}
          </UBadge>
          <UBadge color="neutral" variant="subtle" size="sm">
            <span
              class="mr-1 inline-block size-2 rounded-full"
              :style="{ backgroundColor: `var(--macro-${entry.dominantMacro})` }"
              aria-hidden="true"
            />
            {{ $t(`menu.macroShort.${entry.dominantMacro}`) }}
          </UBadge>
          <UBadge v-if="isSeasonal" color="primary" variant="subtle" size="sm" icon="i-lucide-leaf">
            {{ $t('library.season.badge') }}
          </UBadge>
          <UBadge v-if="isMine" color="neutral" variant="outline" size="sm" icon="i-lucide-user">
            {{ $t('library.myRecipes.badge') }}
          </UBadge>
        </div>
      </div>
    </NuxtLink>

    <div v-if="isMine" class="absolute right-2 top-2 z-10 flex gap-1">
      <UButton
        icon="i-lucide-pencil"
        color="neutral"
        variant="solid"
        size="xs"
        :aria-label="$t('library.myRecipes.edit')"
        @click="emit('edit', entry.recipe.id)"
      />
      <UButton
        icon="i-lucide-trash-2"
        color="neutral"
        variant="solid"
        size="xs"
        :aria-label="$t('library.myRecipes.delete')"
        @click="isConfirmingRemoval = true"
      />
    </div>

    <div
      v-if="isConfirmingRemoval"
      class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-default/95 p-4 text-center"
    >
      <p class="text-sm font-medium">{{ $t('library.myRecipes.removeConfirm') }}</p>
      <div class="flex gap-2">
        <UButton size="sm" color="neutral" variant="ghost" @click="isConfirmingRemoval = false">
          {{ $t('library.myRecipes.cancel') }}
        </UButton>
        <UButton size="sm" color="error" :loading="isRemoving" @click="confirmRemoval">
          {{ $t('library.myRecipes.removeYes') }}
        </UButton>
      </div>
    </div>
  </div>
</template>
