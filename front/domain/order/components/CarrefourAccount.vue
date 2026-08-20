<script setup lang="ts">
// Carrefour's own sign-in page, in its own window, on its own domain. This site
// never shows a field for those credentials: a form in our colours asking for
// them would be a phishing page, however well meant.
const SIGN_IN_URL = 'https://www.carrefour.fr/mon-compte/connexion';

const connect = (): void => {
  window.open(SIGN_IN_URL, 'carrefour-connect', 'width=520,height=680,noopener,noreferrer');
};
</script>

<template>
  <section class="rounded-xl border border-default p-4">
    <h2 class="font-bold">{{ $t('order.carrefour.title') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('order.carrefour.lead') }}</p>

    <button
      type="button"
      class="mt-3 w-full rounded-lg border border-default px-4 py-2 font-semibold"
      @click="connect"
    >
      {{ $t('order.carrefour.connect') }}
      <span class="sr-only">{{ $t('accessibility.newWindow') }}</span>
    </button>
  </section>
</template>
