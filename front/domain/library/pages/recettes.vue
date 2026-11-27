<script setup lang="ts">
import {
  CARD_SIZES,
  preloadLinkOf,
  type LocalImages,
} from '../../../infrastructure/images/utils/localImages';
import type { CustomRecipe } from '../../customCatalog/types/customCatalog.type';

const { recipes, imageOf } = useRecipes();
const { entriesOf } = useRecipeCatalog();
const { seasonalFoodIds, currentMonth } = useSeason();
const { user } = useAuth();
const {
  recipes: myRecipes,
  hasFailed: haveMyRecipesFailed,
  refresh: refreshMyRecipes,
} = useMyRecipes();
const { t } = useNuxtApp().$i18n;
const isMounted = useMounted();

const allRecipes = computed((): Recipe[] => Object.values(recipes));

const isCreateRecipeOpen = ref(false);
const isCreateFoodOpen = ref(false);
const editingRecipe = ref<CustomRecipe>();
const isEditRecipeOpen = ref(false);

// The forms are fetched the first time one is asked for, not with the list.
const createRecipeOpened = useOpenedOnce(isCreateRecipeOpen);
const createFoodOpened = useOpenedOnce(isCreateFoodOpen);
const editRecipeOpened = useOpenedOnce(isEditRecipeOpen);

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

// The list is drawn a screenful at a time. All of it at once is a hundred and
// forty cards and as many photographs, which put a warm visit to this page at
// about 1.05 s on a throttled phone against a 1 s budget, and the cards past
// the fold are not looked at until the reader scrolls to them.
const PAGE_SIZE = 12;
const drawn = ref(PAGE_SIZE);
const shownEntries = computed((): LibraryEntry[] => filteredEntries.value.slice(0, drawn.value));
const hasMore = computed((): boolean => drawn.value < filteredEntries.value.length);

// A new filter starts the list again from the top.
watch([query, macroFilter, timeFilter, seasonOnly], (): void => {
  drawn.value = PAGE_SIZE;
});

// The marker is keyed on the count, so every batch gets a fresh one: an observer
// only reports a change, and a batch too short to push the marker out of range
// would otherwise leave the list stuck.
const endMarker = ref<HTMLElement | null>(null);
useIntersectionObserver(
  endMarker,
  ([entry]): void => {
    if (entry?.isIntersecting === true) drawn.value += PAGE_SIZE;
  },
  { rootMargin: '600px' },
);

const seasonalIds = computed((): string[] => (isMounted.value ? seasonalFoodIds(month.value) : []));

const showSeasonOnly = (): void => {
  seasonOnly.value = true;
};

useSeoMeta({ title: (): string => t('library.pageTitle') });

// The first card's photograph is the largest thing painted: asked for in the head,
// it starts downloading with the page rather than once the list has rendered. Read once,
// here: a head callback runs after setup, outside the Nuxt context imageOf needs.
const firstRecipe = shownEntries.value[0]?.recipe;
const firstImage = firstRecipe === undefined ? undefined : imageOf(firstRecipe);
if (firstImage !== undefined) {
  useHead({
    link: [
      preloadLinkOf(
        firstImage,
        CARD_SIZES,
        useRuntimeConfig().public.localImages as unknown as LocalImages,
      ),
    ],
  });
}
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

    <!-- Their own recipes are missing from the grid below, which would otherwise
         look complete. -->
    <ClientOnly>
      <UAlert
        v-if="user !== undefined && haveMyRecipesFailed"
        role="alert"
        class="mt-6"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="$t('library.myRecipes.loadFailed')"
      >
        <template #actions>
          <UButton color="error" variant="subtle" @click="refreshMyRecipes">
            {{ $t('library.myRecipes.retry') }}
          </UButton>
        </template>
      </UAlert>
    </ClientOnly>

    <ClientOnly>
      <LibraryMyFoodsPanel v-if="user !== undefined" class="rise mt-6" />
    </ClientOnly>

    <!-- The banner depends on the reader's month, so it only exists once mounted.
         Its place is kept meanwhile (measured: 270 px tall on a phone, 128 px from
         the sm breakpoint), or the whole list jumps down when it appears. -->
    <div class="mt-5 min-h-68 sm:min-h-32">
      <LibrarySeasonalBanner
        v-if="isMounted"
        :food-ids="seasonalIds"
        @show-season="showSeasonOnly"
      />
    </div>

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
        v-for="(entry, position) in shownEntries"
        :key="entry.recipe.id"
        :entry="entry"
        :eager="position === 0"
        @edit="editRecipe"
      />
    </div>
    <div v-if="hasMore" ref="endMarker" :key="drawn" aria-hidden="true" class="h-px" />

    <div v-else class="flex flex-col items-center gap-3 py-20 text-center">
      <UIcon name="i-lucide-search-x" class="size-12 text-dimmed" />
      <h2 class="text-xl font-bold">{{ $t('library.empty.title') }}</h2>
      <p class="max-w-sm text-muted">{{ $t('library.empty.hint') }}</p>
      <UButton color="primary" icon="i-lucide-rotate-ccw" class="mt-2" @click="reset">
        {{ $t('library.filter.reset') }}
      </UButton>
    </div>

    <LazyLibraryFoodFormDialog v-if="createFoodOpened" v-model="isCreateFoodOpen" />
    <LazyLibraryRecipeFormDialog v-if="createRecipeOpened" v-model="isCreateRecipeOpen" />
    <LazyLibraryRecipeFormDialog
      v-if="editRecipeOpened"
      v-model="isEditRecipeOpen"
      :recipe="editingRecipe"
    />
  </div>
</template>
