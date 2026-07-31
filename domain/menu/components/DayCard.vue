<script setup lang="ts">
const {
  day,
  targets,
  index = 0,
} = defineProps<{
  day: Day;
  targets: Macros;
  index?: number;
}>();

const isOpen = ref(index === 0);
</script>

<template>
  <UCard
    class="rise overflow-hidden"
    :style="{ animationDelay: `${Math.min(index, 6) * 60}ms` }"
    :ui="{ body: 'p-0 sm:p-0', header: 'p-0 sm:p-0' }"
  >
    <template #header>
      <button
        type="button"
        class="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-elevated/50"
        :aria-expanded="isOpen"
        :aria-controls="`day-${day.key}`"
        @click="isOpen = !isOpen"
      >
        <span class="flex-1 text-lg font-bold">{{ $t(`menu.day.${day.key}`) }}</span>
        <span class="text-sm tabular-nums text-muted">
          {{ Math.round(day.macros.kcal) }} {{ $t('menu.unit.kcal') }}
        </span>
        <UIcon
          name="i-lucide-chevron-down"
          class="size-5 text-dimmed transition-transform duration-300"
          :class="isOpen && 'rotate-180'"
        />
      </button>
    </template>

    <div v-show="isOpen" :id="`day-${day.key}`" class="space-y-1 p-2">
      <MenuMealRow v-for="meal in day.meals" :key="meal.slot" :meal="meal" />

      <div class="mt-2 rounded-2xl bg-elevated/50 p-4">
        <p class="mb-3 text-sm font-semibold">{{ $t('menu.dayTotal') }}</p>
        <MenuMacroBar :macros="day.macros" :targets="targets" compact />
      </div>
    </div>
  </UCard>
</template>
