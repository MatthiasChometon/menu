<script setup lang="ts">
const { entry } = defineProps<{ entry: LibraryEntry }>();

const localePath = useLocalePath();
const { nameOf } = useFoodFormat();
const { imageOf } = useRecipes();

const isSeasonal = computed((): boolean => entry.seasonalIngredientIds.length > 0);
</script>

<template>
  <NuxtLink
    :to="localePath(`/recette/${entry.recipe.id}`)"
    class="group block overflow-hidden rounded-2xl border border-default bg-default transition-shadow hover:shadow-md focus-visible:shadow-md"
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
      </div>
    </div>
  </NuxtLink>
</template>
