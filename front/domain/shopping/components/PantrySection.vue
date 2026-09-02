<script setup lang="ts">
const { entries } = defineProps<{ entries: PantryEntry[] }>();
const emit = defineEmits<{ remove: [id: string] }>();

const { nameOf } = useFoodFormat();
</script>

<template>
  <details v-if="entries.length > 0" class="group rise rounded-2xl border border-default">
    <summary
      class="flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden"
    >
      <span class="flex items-center gap-2 font-bold text-muted">
        <UIcon name="i-lucide-archive" class="size-4 shrink-0" aria-hidden="true" />
        {{ $t('shopping.pantry.sectionTitle') }}
        <span class="tabular-nums font-normal">· {{ entries.length }}</span>
      </span>
      <UIcon
        name="i-lucide-chevron-down"
        class="size-4 shrink-0 text-dimmed transition-transform group-open:rotate-180"
        aria-hidden="true"
      />
    </summary>
    <p class="px-4 pb-2 text-xs text-muted">{{ $t('shopping.pantry.sectionHint') }}</p>
    <ul class="space-y-2 px-3 pb-3">
      <li v-for="entry in entries" :key="entry.id">
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-xl border border-transparent bg-elevated/30 p-2.5 text-left opacity-70 transition-all duration-200 hover:border-primary/40 hover:opacity-100"
          @click="emit('remove', entry.id)"
        >
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated/60"
            aria-hidden="true"
          >
            <UIcon :name="entry.icon" class="size-4 text-dimmed" />
          </span>
          <p class="min-w-0 flex-1 truncate text-sm font-medium line-through">
            {{ nameOf(entry) }}
          </p>
          <span class="shrink-0 text-xs font-semibold text-primary">{{
            $t('shopping.pantry.remove')
          }}</span>
        </button>
      </li>
    </ul>
  </details>
</template>
