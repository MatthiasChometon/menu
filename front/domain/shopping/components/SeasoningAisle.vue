<script setup lang="ts">
const {
  seasonings,
  pickedIds,
  index = 0,
} = defineProps<{
  seasonings: Seasoning[];
  pickedIds: string[];
  index?: number;
}>();

const emit = defineEmits<{ toggle: [seasoningId: string] }>();

const { nameOf } = useFoodFormat();

const pickedCount = computed(
  (): number => seasonings.filter((seasoning): boolean => pickedIds.includes(seasoning.id)).length,
);
</script>

<template>
  <section class="rise" :style="{ animationDelay: `${Math.min(index, 6) * 70}ms` }">
    <div class="mb-2 flex items-baseline justify-between gap-3 px-1">
      <h2 class="font-bold">{{ $t('shopping.aisle.seasoning') }}</h2>
      <span class="text-sm tabular-nums text-muted">
        {{ pickedCount }} / {{ seasonings.length }}
      </span>
    </div>
    <p class="mb-2 px-1 text-sm text-muted">{{ $t('shopping.seasoningHint') }}</p>
    <ul class="space-y-2">
      <li v-for="seasoning in seasonings" :key="seasoning.id">
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200"
          :class="
            pickedIds.includes(seasoning.id)
              ? 'border-transparent bg-elevated/40 opacity-55'
              : 'border-default hover:border-primary/40 hover:bg-elevated/30'
          "
          :aria-pressed="pickedIds.includes(seasoning.id)"
          @click="emit('toggle', seasoning.id)"
        >
          <span
            class="flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors"
            :class="
              pickedIds.includes(seasoning.id)
                ? 'border-primary bg-primary text-white'
                : 'border-muted'
            "
            aria-hidden="true"
          >
            <UIcon v-if="pickedIds.includes(seasoning.id)" name="i-lucide-check" class="size-4" />
          </span>

          <span
            class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-elevated/60"
            aria-hidden="true"
          >
            <UIcon :name="seasoning.icon" class="size-5 text-dimmed" />
          </span>

          <p
            class="min-w-0 flex-1 truncate font-medium"
            :class="pickedIds.includes(seasoning.id) && 'line-through'"
          >
            {{ nameOf(seasoning) }}
          </p>

          <p v-if="seasoning.amount !== undefined" class="shrink-0 font-bold">
            {{ nameOf({ name: seasoning.amount }) }}
          </p>
        </button>
      </li>
    </ul>
  </section>
</template>
