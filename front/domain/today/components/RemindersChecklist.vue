<script setup lang="ts">
const { items, streak } = defineProps<{ items: ReminderItem[]; streak: number }>();

defineEmits<{ toggle: [id: ReminderId] }>();
</script>

<template>
  <UCard class="rise">
    <div class="flex items-center justify-between gap-2">
      <h2 class="flex items-center gap-2 font-bold">
        <UIcon name="i-lucide-alarm-clock-check" class="size-5 text-primary" />
        {{ $t('today.reminders.title') }}
      </h2>
      <p v-if="streak > 0" class="flex items-center gap-1 text-sm font-semibold text-primary">
        <UIcon name="i-lucide-flame" class="size-4" />
        <span class="tabular-nums">{{ streak }}</span>
        {{ streak === 1 ? $t('today.reminders.streakOne') : $t('today.reminders.streakMany') }}
      </p>
    </div>

    <ul class="mt-4 space-y-1.5">
      <li v-for="item in items" :key="item.id">
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-elevated/60"
          :aria-pressed="item.isChecked"
          @click="$emit('toggle', item.id)"
        >
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors"
            :class="item.isChecked ? 'bg-primary text-white' : 'bg-elevated text-primary'"
            aria-hidden="true"
          >
            <UIcon :name="item.isChecked ? 'i-lucide-check' : item.icon" class="size-4" />
          </span>
          <span class="flex-1 font-medium" :class="item.isChecked && 'text-muted line-through'">
            {{ $t(`today.reminders.item.${item.id}`) }}
          </span>
          <span class="sr-only">
            {{ item.isChecked ? $t('today.reminders.markUndone') : $t('today.reminders.markDone') }}
          </span>
        </button>
      </li>
    </ul>
  </UCard>
</template>
