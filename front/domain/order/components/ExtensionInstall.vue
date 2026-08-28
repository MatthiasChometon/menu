<script setup lang="ts">
// Store pages for the paired-browser extension. Placeholders until it is
// published: swap in the real listing URLs and nothing else on the page changes.
// Edge installs the Chrome one, so it needs no link of its own.
const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/menu-courses-carrefour';
const FIREFOX_STORE_URL = 'https://addons.mozilla.org/fr/firefox/addon/menu-courses-carrefour/';
</script>

<template>
  <section class="rounded-xl border border-default p-4">
    <h2 class="font-bold">{{ $t('order.install.title') }}</h2>
    <p class="mt-1 text-sm text-muted">{{ $t('order.install.lead') }}</p>

    <div class="mt-3 flex flex-col gap-2 sm:flex-row">
      <UButton
        :to="CHROME_STORE_URL"
        target="_blank"
        rel="noopener noreferrer"
        icon="i-lucide-chrome"
        color="primary"
        class="justify-center font-semibold text-white"
      >
        {{ $t('order.install.chrome') }}
        <span class="sr-only">{{ $t('accessibility.newWindow') }}</span>
      </UButton>
      <UButton
        :to="FIREFOX_STORE_URL"
        target="_blank"
        rel="noopener noreferrer"
        icon="i-lucide-globe"
        color="neutral"
        variant="outline"
        class="justify-center font-semibold"
      >
        {{ $t('order.install.firefox') }}
        <span class="sr-only">{{ $t('accessibility.newWindow') }}</span>
      </UButton>
    </div>

    <p class="mt-2 text-xs text-muted">{{ $t('order.install.edgeNote') }}</p>
    <p class="mt-2 text-xs text-muted">{{ $t('order.install.thenPair') }}</p>
  </section>
</template>
