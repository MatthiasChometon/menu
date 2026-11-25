<script setup lang="ts">
const { hasWeek, state, savedLabel, weekLabel } = defineProps<{
  hasWeek: boolean;
  state: SaveState;
  savedLabel: string;
  weekLabel: string;
}>();
</script>

<template>
  <!-- Why the save button is grey, right under it: signed out, nothing changed,
       or already done — said where the eye already is. The region itself stays
       in the page so a screen reader is told when its content changes; a live
       region inserted together with its message is often not announced. -->
  <div class="mt-2" role="status">
    <template v-if="hasWeek">
      <p v-if="state === 'signedOut'" class="text-sm text-muted">
        {{ $t('planner.saving.signedOut') }}
      </p>
      <p v-else-if="state === 'failed'" class="text-sm text-error" role="alert">
        {{ $t('planner.saving.failed') }}
      </p>
      <p v-else-if="state === 'pending'" class="text-sm text-muted">
        {{ $t('planner.saving.pending') }}
      </p>
      <p v-else-if="state === 'saved'" class="text-sm text-muted">
        {{ $t('planner.saving.done') }} {{ savedLabel }} — {{ weekLabel }}
      </p>
      <p v-else class="text-sm text-muted">{{ $t('planner.saving.nothingToSave') }}</p>
    </template>
  </div>
</template>
