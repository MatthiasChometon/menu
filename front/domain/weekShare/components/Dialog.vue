<script setup lang="ts">
const { isOpen, close } = useWeekShare();
const { selectedMenu: menu } = useSelectedWeek();
const { t } = useNuxtApp().$i18n;

const card = useTemplateRef<WeekShareCardHandle>('card');
const { canShareFiles } = useWeekShareCard();
const isSharing = ref(false);

// A card that could not be turned into an image, or a share that failed, is
// said out loud: a button that does nothing reads as a broken page.
const { hasFailed, run } = useAttempt('weekShare.export');

const onDownload = (): Promise<void> =>
  run(async (): Promise<void> => {
    await card.value?.download();
  });

const onShare = async (): Promise<void> => {
  isSharing.value = true;
  try {
    await run(async (): Promise<void> => {
      await card.value?.shareCard();
    });
  } finally {
    isSharing.value = false;
  }
};
</script>

<template>
  <UModal v-model:open="isOpen" :title="t('weekShare.title')">
    <template #body>
      <div v-if="menu !== undefined" class="flex flex-col items-center gap-4">
        <p class="text-center text-sm text-muted">{{ t('weekShare.lead') }}</p>

        <WeekShareCard ref="card" :menu="menu" />

        <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <UButton icon="i-lucide-download" variant="outline" color="neutral" @click="onDownload">
            {{ t('weekShare.download') }}
          </UButton>
          <ClientOnly>
            <UButton
              v-if="canShareFiles()"
              icon="i-lucide-share-2"
              :loading="isSharing"
              class="text-white"
              @click="onShare"
            >
              {{ t('weekShare.share') }}
            </UButton>
          </ClientOnly>
        </div>

        <p v-if="hasFailed" role="alert" class="text-center text-sm text-error">
          {{ t('weekShare.failed') }}
        </p>
      </div>

      <p v-else class="text-sm text-muted">{{ t('weekShare.empty') }}</p>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton variant="ghost" color="neutral" @click="close">
          {{ t('weekShare.close') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
