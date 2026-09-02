<script setup lang="ts">
// A margin note, kept on this device: what actually happened the last time
// this recipe was cooked, in the reader's own words.
const { recipeId } = defineProps<{ recipeId: string }>();

const { note } = useRecipeNotes(computed((): string => recipeId));
const { maxLength } = useRecipeNoteConstraints();

const remaining = computed((): number => maxLength - note.value.length);
const isNearLimit = computed((): boolean => remaining.value <= 40);
</script>

<template>
  <section class="rise space-y-2" style="animation-delay: 40ms">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-xl font-bold">{{ $t('recipe.note.title') }}</h2>
      <span
        class="shrink-0 text-xs tabular-nums"
        :class="isNearLimit ? 'text-warning' : 'text-dimmed'"
      >
        {{ note.length }}/{{ maxLength }}
      </span>
    </div>
    <p class="text-sm text-muted">{{ $t('recipe.note.hint') }}</p>
    <UTextarea
      v-model="note"
      :maxlength="maxLength"
      :rows="3"
      :placeholder="$t('recipe.note.placeholder')"
      :aria-label="$t('recipe.note.title')"
      class="w-full"
    />
  </section>
</template>
