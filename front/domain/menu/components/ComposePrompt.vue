<script setup lang="ts">
const localePath = useLocalePath();
const {
  isGenerating: isGeneratingFirstWeek,
  hasFailed: generateFirstWeekFailed,
  generate: generateFirstWeek,
} = useGenerateFirstWeek();
</script>

<template>
  <div class="flex flex-col items-center gap-3 py-20 text-center">
    <UIcon name="i-lucide-calendar-plus" class="size-12 text-dimmed" />
    <h2 class="text-xl font-bold">{{ $t('menu.compose.title') }}</h2>
    <p class="max-w-sm text-muted">{{ $t('menu.compose.hint') }}</p>
    <!-- The one-click path first, since it is the whole point of never
         showing an empty week — composing by hand stays one tap away for
         whoever would rather choose every dish. -->
    <div class="mt-2 flex flex-wrap justify-center gap-3">
      <UButton
        color="primary"
        icon="i-lucide-sparkles"
        class="font-semibold text-white"
        :loading="isGeneratingFirstWeek"
        :disabled="isGeneratingFirstWeek"
        @click="generateFirstWeek"
      >
        {{
          isGeneratingFirstWeek ? $t('planner.generate.working') : $t('menu.compose.generateAction')
        }}
      </UButton>
      <UButton
        :to="localePath('/composer')"
        color="primary"
        variant="outline"
        icon="i-lucide-square-pen"
      >
        {{ $t('menu.compose.action') }}
      </UButton>
    </div>
    <UAlert
      v-if="generateFirstWeekFailed"
      class="mt-3"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="$t('menu.compose.generateError')"
    />
  </div>
</template>
