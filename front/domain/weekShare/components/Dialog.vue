<script setup lang="ts">
const { isOpen, close } = useWeekShare();
const { selectedMenu: menu } = useSelectedWeek();
const { t } = useNuxtApp().$i18n;

const cardRef = ref<WeekShareCardHandle | null>(null);
const isSharing = ref(false);

const canShareFiles = (): boolean => {
  const { canShareFiles: supported } = useWeekShareCard();
  return supported();
};

const onDownload = async (): Promise<void> => {
  await cardRef.value?.download();
};

const onShare = async (): Promise<void> => {
  isSharing.value = true;
  await cardRef.value?.shareCard();
  isSharing.value = false;
};
</script>

<template>
  <UModal v-model:open="isOpen" :title="t('weekShare.title')">
    <template #body>
      <div v-if="menu !== undefined" class="flex flex-col items-center gap-4">
        <p class="text-center text-sm text-muted">{{ t('weekShare.lead') }}</p>

        <WeekShareCard ref="cardRef" :menu="menu" />

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
