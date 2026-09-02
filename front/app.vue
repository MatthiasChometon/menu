<script setup lang="ts">
import { en, fr } from '@nuxt/ui/locale';

const { locale } = useNuxtApp().$i18n;
// Localize Nuxt UI's own strings ("No data", search placeholders, …) to match
// the app language — they are separate from the @nuxtjs/i18n messages.
const uiLocale = computed(() => (locale.value === 'fr' ? fr : en));

// The site's defaults for a pasted link: title, description and preview image.
// Set before the i18n head below, which adds og:url and the locale alternates.
useLinkPreview();

const head = useLocaleHead({ seo: true });

type LocaleHead = (typeof head)['value'];

useHead({
  htmlAttrs: { lang: (): string => head.value.htmlAttrs?.lang ?? 'fr' },
  link: (): NonNullable<LocaleHead['link']> => head.value.link ?? [],
  meta: (): NonNullable<LocaleHead['meta']> => head.value.meta ?? [],
});
</script>

<template>
  <UApp :locale="uiLocale">
    <!-- Nuxt's own page-to-page progress bar, painted in the app's primary so it
         reads as part of the site rather than Nuxt's default green. The built-in
         throttle holds it back on the instant transitions between prerendered
         pages, so it only appears when a navigation actually waits on something —
         a chunk not yet cached, or a signed-in page fetching its week. -->
    <NuxtLoadingIndicator color="var(--ui-primary)" />
    <UiAppShell>
      <template #header>
        <MenuHeader />
      </template>
      <NuxtPage />

      <LegalFooter />

      <BugReportButton />
      <BugReportDialog />
      <ImprovementRequestButton />
      <ImprovementRequestDialog />
      <WeekShareButton />
      <WeekShareDialog />
      <template #footer>
        <MenuBottomNav />
      </template>
    </UiAppShell>
  </UApp>
</template>
