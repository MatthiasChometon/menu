export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      // The address the legal pages publish, and the one RGPD requests arrive
      // at. Configuration rather than a translated string: it is the same in
      // every language, and vue-i18n reads the @ of an address as its own
      // linked-message syntax — which renders it broken.
      legalContact: process.env.NUXT_PUBLIC_LEGAL_CONTACT ?? 'contact@luzi6802.odns.fr',
    },
  },
});
