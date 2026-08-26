<script setup lang="ts">
// Carrefour's own sign-in page (Carrefour Connect / ForgeRock IAM), in its own
// window, on its own domain. This site never shows a field for those
// credentials: a form in our colours asking for them would be a phishing page,
// however well meant.
//
// www.carrefour.fr/mon-compte/connexion is a 404 — that path no longer exists.
// This is the live login entry the store actually uses; logging in here sets
// the shared Carrefour Connect session the extension then works with.
const SIGN_IN_URL = 'https://moncompte.carrefour.fr/iam/XUI/#login/';

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
