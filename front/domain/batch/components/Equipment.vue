<script setup lang="ts">
const { items } = defineProps<{ items: EquipmentItem[] }>();

// A photo of the tool when the host has one, the lucide pictogram otherwise —
// the same graceful fallback the dishes and ingredients use.
const { equipmentImage } = useImages();

// Gathering the kit is a one-off ritual before the session starts, not a state
// worth remembering after: ticked here, forgotten once the plan itself
// (the timeline, then the checklist below) takes over.
const checked = ref(new Set<string>());

const toggle = (id: string): void => {
  const next = new Set(checked.value);
  if (!next.delete(id)) next.add(id);
  checked.value = next;
};

const isChecked = (id: string): boolean => checked.value.has(id);
</script>

<template>
  <section class="rise">
    <h2 class="text-xl font-bold">{{ $t('batch.equipment.title') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('batch.equipment.hint') }}</p>

    <ul class="mt-4 grid gap-2 sm:grid-cols-2">
      <li v-for="item in items" :key="item.id">
        <button
          type="button"
          role="checkbox"
          class="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors"
          :class="
            isChecked(item.id)
              ? 'border-primary/40 bg-primary/5'
              : 'border-default hover:border-primary/50 hover:bg-elevated/50'
          "
          :aria-checked="isChecked(item.id)"
          @click="toggle(item.id)"
        >
          <span
            class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg"
            :class="
              equipmentImage(item.id)
                ? 'bg-elevated'
                : isChecked(item.id)
                  ? 'bg-primary/15 text-primary'
                  : 'bg-elevated text-muted'
            "
            aria-hidden="true"
          >
            <img
              v-if="equipmentImage(item.id)"
              :src="equipmentImage(item.id)"
              alt=""
              class="size-full object-cover"
            />
            <UIcon v-else :name="item.icon" class="size-4.5" />
          </span>
          <span
            class="min-w-0 flex-1 text-sm font-medium"
            :class="isChecked(item.id) && 'text-dimmed line-through'"
          >
            {{ $t(`batch.equipment.items.${item.id}`) }}
          </span>
          <span
            v-if="item.count !== undefined"
            class="shrink-0 rounded-full bg-elevated px-2 py-0.5 text-xs font-semibold tabular-nums"
          >
            {{ item.count }}
          </span>
          <UIcon
            v-if="isChecked(item.id)"
            name="i-lucide-check"
            class="size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
        </button>
      </li>
    </ul>
  </section>
</template>
