<script setup lang="ts">
import { BugSeverity } from '#gql/default';

const { isOpen, state, close, send } = useBugReport();
const { t } = useNuxtApp().$i18n;

// Ten characters is the back's own floor. Enforced here too so the button says
// "not yet" before the server does — being refused after pressing send is the
// moment people give up on reporting anything.
const MIN_LENGTH = 10;

const message = ref('');
const severity = ref<BugSeverity>(BugSeverity.ANNOYING);

const severities = computed((): { value: BugSeverity; label: string; icon: string }[] => [
  { value: BugSeverity.BLOCKING, label: t('bugReport.blocking'), icon: 'i-lucide-octagon-x' },
  { value: BugSeverity.ANNOYING, label: t('bugReport.annoying'), icon: 'i-lucide-triangle-alert' },
  { value: BugSeverity.COSMETIC, label: t('bugReport.cosmetic'), icon: 'i-lucide-brush' },
]);

const isTooShort = computed((): boolean => message.value.trim().length < MIN_LENGTH);

const submit = async (): Promise<void> => {
  if (isTooShort.value) return;

  await send(severity.value, message.value.trim());
  if (state.value === 'sent') message.value = '';
};
</script>

<template>
  <UModal v-model:open="isOpen" :title="$t('bugReport.title')">
    <template #body>
      <!-- Thanked and told what left with it: somebody who reports a bug into
           silence does not report the next one. -->
      <div v-if="state === 'sent'" class="flex flex-col items-center gap-3 py-4 text-center">
        <UIcon name="i-lucide-circle-check" class="size-10 text-primary" />
        <p class="text-lg font-bold">{{ $t('bugReport.sent') }}</p>
        <p class="max-w-sm text-sm text-muted">{{ $t('bugReport.sentLead') }}</p>
        <UButton class="mt-2" @click="close">{{ $t('bugReport.close') }}</UButton>
      </div>

      <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
        <p class="text-sm text-muted">{{ $t('bugReport.lead') }}</p>

        <UFormField :label="$t('bugReport.label')" required>
          <UTextarea
            v-model="message"
            :rows="4"
            autofocus
            :placeholder="$t('bugReport.placeholder')"
            class="w-full"
          />
        </UFormField>

        <fieldset class="flex flex-col gap-2">
          <legend class="mb-1 text-sm font-medium">{{ $t('bugReport.severity') }}</legend>
          <div class="grid grid-cols-3 gap-2">
            <UButton
              v-for="entry in severities"
              :key="entry.value"
              type="button"
              :icon="entry.icon"
              size="sm"
              block
              :variant="severity === entry.value ? 'soft' : 'outline'"
              :color="severity === entry.value ? 'primary' : 'neutral'"
              :aria-pressed="severity === entry.value"
              @click="severity = entry.value"
            >
              {{ entry.label }}
            </UButton>
          </div>
        </fieldset>

        <p v-if="state === 'failed'" class="text-sm text-error">{{ $t('bugReport.failed') }}</p>

        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" type="button" @click="close">
            {{ $t('bugReport.cancel') }}
          </UButton>
          <UButton
            type="submit"
            :disabled="isTooShort"
            :loading="state === 'sending'"
            :title="isTooShort ? $t('bugReport.tooShort') : undefined"
          >
            {{ $t('bugReport.send') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
