<script setup lang="ts">
const { password, isBusy, failure, needsPassword, remove } = useAccountDeletion();

const isOpen = ref(false);

// Nothing is pre-armed: opening the dialog starts from a blank box and no
// error, so a refusal from a previous attempt cannot look like a fresh one.
const open = (): void => {
  password.value = '';
  failure.value = undefined;
  isOpen.value = true;
};

const canConfirm = computed((): boolean => !needsPassword.value || password.value.length > 0);

const confirm = async (): Promise<void> => {
  if (!canConfirm.value) return;

  const done = await remove();
  if (done) isOpen.value = false;
};
</script>

<template>
  <!-- Set apart, at the bottom, behind a dialog: irreversible and rarely
       wanted. It still has to be findable, because the privacy policy promises
       it — a promise the site keeps rather than one somebody remembers to. -->
  <section class="mt-12 rounded-2xl border border-error/30 p-5">
    <h2 class="text-lg font-bold">{{ $t('auth.delete.title') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('auth.delete.lead') }}</p>

    <UButton class="mt-4" color="error" variant="soft" icon="i-lucide-trash-2" @click="open">
      {{ $t('auth.delete.action') }}
    </UButton>

    <UModal v-model:open="isOpen" :title="$t('auth.delete.confirmTitle')">
      <template #body>
        <div class="flex flex-col gap-4">
          <p>{{ $t('auth.delete.confirmLead') }}</p>

          <!-- Named one by one rather than summarised: somebody about to lose
               data should read what goes, not a word that stands for it. -->
          <ul class="list-inside list-disc space-y-1 text-sm text-muted">
            <li>{{ $t('auth.delete.goesAccount') }}</li>
            <li>{{ $t('auth.delete.goesProfile') }}</li>
            <li>{{ $t('auth.delete.goesWeeks') }}</li>
          </ul>

          <p class="text-sm text-muted">{{ $t('auth.delete.staysReports') }}</p>

          <UFormField v-if="needsPassword" :label="$t('auth.delete.passwordLabel')" required>
            <UInput
              v-model="password"
              type="password"
              autocomplete="current-password"
              class="w-full"
            />
          </UFormField>

          <p v-if="failure === 'password'" class="text-sm text-error">
            {{ $t('auth.delete.wrongPassword') }}
          </p>
          <p v-else-if="failure === 'unknown'" class="text-sm text-error">
            {{ $t('auth.delete.failed') }}
          </p>

          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="isOpen = false">
              {{ $t('auth.delete.cancel') }}
            </UButton>
            <UButton color="error" :disabled="!canConfirm" :loading="isBusy" @click="confirm">
              {{ $t('auth.delete.confirmAction') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </section>
</template>
