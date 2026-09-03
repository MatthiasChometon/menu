<script setup lang="ts">
import type { CustomRecipe } from '../../customCatalog/types/customCatalog.type';

const { recipes } = useRecipes();
const { entriesOf } = useRecipeCatalog();
const { seasonalFoodIds, currentMonth } = useSeason();
const { user } = useAuth();
const { recipes: myRecipes } = useMyRecipes();
const { t } = useNuxtApp().$i18n;
const isMounted = useMounted();

const allRecipes = computed((): Recipe[] => Object.values(recipes));

const isCreateRecipeOpen = ref(false);
const isCreateFoodOpen = ref(false);
const editingRecipe = ref<CustomRecipe>();
const isEditRecipeOpen = ref(false);

const editRecipe = (id: string): void => {
  const recipe = myRecipes.value.find((candidate): boolean => candidate.id === id);
  if (recipe === undefined) return;

  editingRecipe.value = recipe;
  isEditRecipeOpen.value = true;
};

// The build's own month would freeze into a static page; the reader's month
// only exists once the client has mounted and can read the real clock.
const month = computed((): Month => (isMounted.value ? currentMonth() : 1));

const entries = computed((): LibraryEntry[] => entriesOf(allRecipes.value, month.value));

const { query, macroFilter, timeFilter, seasonOnly, filteredEntries, reset } =
  useLibraryFilters(entries);

const seasonalIds = computed((): string[] => (isMounted.value ? seasonalFoodIds(month.value) : []));

const showSeasonOnly = (): void => {
  seasonOnly.value = true;
};

useSeoMeta({ title: (): string => t('library.pageTitle') });
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-6 sm:py-10">
    <header class="rise flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl">
          {{ $t('library.pageTitle') }}
        </h1>
        <p class="mt-1.5 max-w-xl text-muted">{{ $t('library.pageLead') }}</p>
      </div>

      <!-- Offered only to somebody signed in: a custom recipe or food is
           stored under an account, and there is nowhere to keep one otherwise. -->
      <ClientOnly>
        <div v-if="user !== undefined" class="flex shrink-0 gap-2">
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            variant="outline"
            size="sm"
            @click="isCreateFoodOpen = true"
          >
            {{ $t('library.myFoods.create') }}
          </UButton>
          <UButton icon="i-lucide-plus" size="sm" @click="isCreateRecipeOpen = true">
            {{ $t('library.myRecipes.create') }}
          </UButton>
        </div>
      </ClientOnly>
    </header>

    <ClientOnly>
      <LibraryMyFoodsPanel v-if="user !== undefined" class="rise mt-6" />
    </ClientOnly>

    <LibrarySeasonalBanner
      v-if="isMounted"
      class="mt-5"
      :food-ids="seasonalIds"
      @show-season="showSeasonOnly"
    />

    <LibraryFilters
      v-model:query="query"
      v-model:macro-filter="macroFilter"
      v-model:time-filter="timeFilter"
      v-model:season-only="seasonOnly"
      class="rise mt-6"
      style="animation-delay: 40ms"
    />

    <p class="mt-4 text-sm tabular-nums text-muted" role="status">
      {{ filteredEntries.length }}
      {{ filteredEntries.length > 1 ? $t('library.results') : $t('library.result') }}
    </p>

    <div v-if="filteredEntries.length > 0" class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <LibraryRecipeCard
        v-for="entry in filteredEntries"
        :key="entry.recipe.id"
        :entry="entry"
        @edit="editRecipe"
      />
    </div>

    <div v-else class="flex flex-col items-center gap-3 py-20 text-center">
      <UIcon name="i-lucide-search-x" class="size-12 text-dimmed" />
      <h2 class="text-xl font-bold">{{ $t('library.empty.title') }}</h2>
      <p class="max-w-sm text-muted">{{ $t('library.empty.hint') }}</p>
      <UButton color="primary" icon="i-lucide-rotate-ccw" class="mt-2" @click="reset">
        {{ $t('library.filter.reset') }}
      </UButton>
    </div>

    <LibraryFoodFormDialog v-model="isCreateFoodOpen" />
    <LibraryRecipeFormDialog v-model="isCreateRecipeOpen" />
    <LibraryRecipeFormDialog v-model="isEditRecipeOpen" :recipe="editingRecipe" />
  </div>
</template>
