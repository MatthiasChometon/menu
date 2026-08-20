// What a pasted link turns into on Discord, WhatsApp, Slack or iMessage. Those
// platforms fetch the page and read its og: tags — without them the message is
// a bare URL, which tells the person receiving it nothing at all.
//
// Called once from app.vue: these are the site's defaults, and a page that
// wants a card of its own overrides them by setting its own title.
export const useLinkPreview = (): void => {
  // $i18n rather than useI18n(): outside a component's setup, useI18n() has no
  // instance to attach to.
  const { t, locale } = useNuxtApp().$i18n;
  const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/+$/, '');

  // One image per language, because the name of the site is itself translated.
  const image = (): string => `${siteUrl}/og-${locale.value === 'en' ? 'en' : 'fr'}.png`;

  useHead({
    // %s is the page's own title, filled in by unhead. It is what lets a recipe
    // link announce the recipe rather than the site, without every page having
    // to repeat the brand.
    templateParams: {
      siteName: (): string => t('menu.brand'),
      separator: '·',
    },
    titleTemplate: '%s %separator %siteName',
  });

  useSeoMeta({
    description: (): string => t('seo.description'),
    ogType: 'website',
    ogSiteName: (): string => t('menu.brand'),
    ogTitle: '%s %separator %siteName',
    ogDescription: (): string => t('seo.description'),
    ogImage: image,
    // Declared so the card reserves the right shape while the image loads,
    // instead of reflowing once it arrives.
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageType: 'image/png',
    ogImageAlt: (): string => t('seo.imageAlt'),
    // Twitter reads its own set and ignores og: for the card shape. Without
    // this the image is shown as a small square thumbnail beside the text.
    twitterCard: 'summary_large_image',
    twitterTitle: '%s %separator %siteName',
    twitterDescription: (): string => t('seo.description'),
    twitterImage: image,
    twitterImageAlt: (): string => t('seo.imageAlt'),
  });
};
