<script setup lang="ts">
const open = defineModel<boolean>({ required: true });

const { fontScale, isHighContrast, setFontScale, toggleHighContrast } = useDisplayPreferences();
const { t } = useNuxtApp().$i18n;

const fontScaleItems = computed((): { value: FontScale; label: string }[] => [
  { value: 'normal', label: t('displayPreferences.fontScale.normal') },
  { value: 'large', label: t('displayPreferences.fontScale.large') },
]);
</script>

<template>
  <UModal v-model:open="open" :title="t('displayPreferences.title')">
    <template #body>
      <div class="flex flex-col gap-5">
        <p class="text-sm text-muted">{{ t('displayPreferences.lead') }}</p>

        <fieldset>
          <legend class="mb-2 text-sm font-medium">
            {{ t('displayPreferences.fontScale.label') }}
          </legend>
          <div class="grid grid-cols-2 gap-2">
            <UButton
              v-for="entry in fontScaleItems"
              :key="entry.value"
              type="button"
              size="sm"
              block
              :variant="fontScale === entry.value ? 'solid' : 'outline'"
              :color="fontScale === entry.value ? 'primary' : 'neutral'"
              :aria-pressed="fontScale === entry.value"
              @click="setFontScale(entry.value)"
            >
              {{ entry.label }}
            </UButton>
          </div>
        </fieldset>

        <div class="flex items-center justify-between gap-3 rounded-lg border border-default p-3">
          <div class="min-w-0">
            <p class="text-sm font-medium">{{ t('displayPreferences.highContrast.label') }}</p>
            <p class="text-xs text-muted">{{ t('displayPreferences.highContrast.hint') }}</p>
          </div>
          <USwitch
            :model-value="isHighContrast"
            :aria-label="t('displayPreferences.highContrast.label')"
            @update:model-value="toggleHighContrast"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <UButton block @click="open = false">{{ t('displayPreferences.done') }}</UButton>
    </template>
  </UModal>
</template>
