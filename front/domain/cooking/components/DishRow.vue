<script setup lang="ts">
const { progress } = defineProps<{ progress: DishProgress }>();

defineEmits<{ undo: [] }>();

const { imageOf } = useRecipes();
const { nameOf } = useFoodFormat();
const localePath = useLocalePath();

const isDone = computed((): boolean => progress.status === 'done');

// Everything cooked has been eaten: the dish is finished for the week, and
// saying "0 portions left" would read as a problem rather than a job done.
const isFinished = computed((): boolean => isDone.value && progress.left === 0);
</script>

<template>
  <div class="flex items-center gap-3 rounded-2xl border border-default p-2.5">
    <div class="size-11 shrink-0 overflow-hidden rounded-lg" :class="isFinished && 'opacity-50'">
      <UiThumb
        :src="imageOf(progress.recipe)"
        :alt="nameOf(progress.recipe)"
        icon="i-lucide-cooking-pot"
      />
    </div>

    <div class="min-w-0 flex-1">
      <NuxtLink
        :to="localePath(`/recette/${progress.recipe.id}`)"
        class="block truncate text-sm font-medium hover:underline"
      >
        {{ nameOf(progress.recipe) }}
      </NuxtLink>
      <p v-if="isFinished" class="text-xs text-dimmed">{{ $t('cooking.allEaten') }}</p>
      <p v-else-if="isDone" class="text-xs text-muted">
        <span class="font-semibold tabular-nums text-primary">{{ progress.left }}</span>
        {{ progress.left === 1 ? $t('cooking.portionLeft') : $t('cooking.portionsLeft') }}
      </p>
      <p v-else class="text-xs text-dimmed">
        <span class="tabular-nums">{{ progress.servings }}</span>
        {{ progress.servings === 1 ? $t('cooking.portionOne') : $t('cooking.portions') }}
      </p>
    </div>

    <UButton
      icon="i-lucide-undo-2"
      variant="ghost"
      color="neutral"
      size="sm"
      class="shrink-0"
      :aria-label="$t('cooking.putBack')"
      @click="$emit('undo')"
    />
  </div>
</template>
