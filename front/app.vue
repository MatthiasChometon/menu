<script setup lang="ts">
import { en, fr } from '@nuxt/ui/locale';

const { locale } = useNuxtApp().$i18n;
// Localize Nuxt UI's own strings ("No data", search placeholders, …) to match
// the app language — they are separate from the @nuxtjs/i18n messages.
const uiLocale = computed(() => (locale.value === 'fr' ? fr : en));

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
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
