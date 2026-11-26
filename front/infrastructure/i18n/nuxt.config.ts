import { buildDynamicLayers } from '../ddd/buildDynamicLayers';

const { translationFileList } = buildDynamicLayers();

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
    // The messages are files, so the module compiles them while building. What the
    // browser then needs is the message runtime, not the compiler that turns a
    // message string into a function (about 30 KB of the entry chunk).
    bundle: { runtimeOnly: true, dropMessageCompiler: true },
    detectBrowserLanguage: { useCookie: true, cookieKey: 'i18n_redirected', redirectOn: 'root' },
  },
});
