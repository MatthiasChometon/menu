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

// The three dialogs hold forms and Nuxt UI's modal machinery. They are fetched and
// mounted the first time someone asks for one, not with every page.
const bugReportOpened = useOpenedOnce(useBugReport().isOpen);
const improvementOpened = useOpenedOnce(useImprovement().isOpen);
const weekShareOpened = useOpenedOnce(useWeekShare().isOpen);

const { fontScale, isHighContrast } = useDisplayPreferences();

// Space-separated so both can be on at once — someone who wants a bigger font
// and stronger contrast should get both, not have to pick one.
const displayPreferenceClass = computed((): string =>
  [
    fontScale.value === 'large' ? 'font-scale-large' : '',
    isHighContrast.value ? 'high-contrast' : '',
  ]
    .filter((entry): boolean => entry !== '')
    .join(' '),
);

useHead({
  htmlAttrs: {
    lang: (): string => head.value.htmlAttrs.lang ?? 'fr',
    class: (): string => displayPreferenceClass.value,
  },
  link: (): NonNullable<LocaleHead['link']> => head.value.link,
  meta: (): NonNullable<LocaleHead['meta']> => head.value.meta,
});
</script>

<template>
  <UApp :locale="uiLocale">
    <!-- Nuxt's own page-to-page progress bar, painted in the app's primary so it
         reads as part of the site rather than Nuxt's default green. No throttle:
         the default holds the bar back for 200 ms, and a tap on a slow phone then
         shows nothing for longer than the 100 ms a reader takes as instant. -->
    <NuxtLoadingIndicator color="var(--ui-primary)" :throttle="0" />
    <UiAppShell>
      <template #header>
        <MenuHeader />
      </template>
      <NuxtPage />

      <LegalFooter />

      <BugReportButton />
      <LazyBugReportDialog v-if="bugReportOpened" />
      <ImprovementRequestButton />
      <LazyImprovementRequestDialog v-if="improvementOpened" />
      <WeekShareButton />
      <LazyWeekShareDialog v-if="weekShareOpened" />
      <template #footer>
        <MenuBottomNav />
      </template>
    </UiAppShell>
  </UApp>
</template>
