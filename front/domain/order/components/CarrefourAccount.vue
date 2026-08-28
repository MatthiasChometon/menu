<script setup lang="ts">
// Carrefour's own sign-in page (Carrefour Connect / ForgeRock IAM), in its own
// window, on its own domain. This site never shows a field for those
// credentials: a form in our colours asking for them would be a phishing page,
// however well meant.
//
// www.carrefour.fr/mon-compte/connexion is a 404 — that path no longer exists.
// This is the live login entry the store actually uses; logging in here sets
// the shared Carrefour Connect session the extension then works with.
//
// A plain link in a new tab, not window.open: a sized popup with noopener is
// exactly what pop-up blockers stop, and a click that opens nothing reads as a
// broken button. A tab is never blocked and gives the login room to breathe.
const SIGN_IN_URL = 'https://moncompte.carrefour.fr/iam/XUI/#login/';
</script>

<template>
  <section class="rounded-xl border border-default p-4">
    <h2 class="font-bold">{{ $t('order.carrefour.title') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('order.carrefour.lead') }}</p>

    <a
      :href="SIGN_IN_URL"
      target="_blank"
      rel="noopener noreferrer"
      class="mt-3 block w-full rounded-lg border border-default px-4 py-2 text-center font-semibold transition-colors hover:bg-elevated/50"
    >
      {{ $t('order.carrefour.connect') }}
      <span class="sr-only">{{ $t('accessibility.newWindow') }}</span>
    </a>
  </section>
</template>
