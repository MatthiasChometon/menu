<script setup lang="ts">
import type { NuxtError } from '#app';

const { error } = defineProps<{ error: NuxtError }>();

const { t } = useNuxtApp().$i18n;
const localePath = useLocalePath();

// A mistyped address and a server that fell over are not the same news, and the
// reader can act on one of them.
const isMissing = computed((): boolean => error.statusCode === 404);

// clearError rather than a plain link: without it Nuxt keeps the error state
// and the next page renders inside it.
const goHome = async (): Promise<void> => {
  await clearError({ redirect: localePath('/') });
};

useSeoMeta({
  title: (): string => t(isMissing.value ? 'error.missing.title' : 'error.broken.title'),
});
</script>

<template>
  <UiAppShell>
    <template #header>
      <MenuHeader />
    </template>

    <div class="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20 text-center">
      <UIcon
        :name="isMissing ? 'i-lucide-map-pin-off' : 'i-lucide-unplug'"
        class="size-12 text-dimmed"
      />
      <p class="text-sm font-bold tabular-nums text-muted">{{ error.statusCode }}</p>
      <h1 class="text-2xl font-black tracking-tight sm:text-3xl">
        {{ $t(isMissing ? 'error.missing.title' : 'error.broken.title') }}
      </h1>
      <p class="text-muted">
        {{ $t(isMissing ? 'error.missing.hint' : 'error.broken.hint') }}
      </p>

      <UButton class="mt-2" color="primary" icon="i-lucide-calendar-days" @click="goHome">
        {{ $t('error.home') }}
      </UButton>
    </div>

    <LegalFooter />

    <template #footer>
      <MenuBottomNav />
    </template>
  </UiAppShell>
</template>
