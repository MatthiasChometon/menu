import { translationFileList } from '../../ddd';

export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    baseUrl: process.env.NUXT_PUBLIC_I18N_BASE_URL ?? 'http://localhost:3777',
    defaultLocale: 'fr',
    strategy: 'prefix_except_default',
    locales: [
      { code: 'fr', language: 'fr-FR', name: 'Français', files: translationFileList('fr') },
      { code: 'en', language: 'en-US', name: 'English', files: translationFileList('en') },
    ],
    detectBrowserLanguage: { useCookie: true, cookieKey: 'i18n_redirected', redirectOn: 'root' },
  },
});
