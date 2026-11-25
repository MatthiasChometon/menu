<script setup lang="ts">
const localePath = useLocalePath();
const { t } = useNuxtApp().$i18n;

const links = computed((): { to: string; label: string }[] => [
  { to: localePath('/mentions-legales'), label: t('legal.footer.notice') },
  { to: localePath('/confidentialite'), label: t('legal.footer.privacy') },
  { to: localePath('/conditions'), label: t('legal.footer.terms') },
]);
</script>

<template>
  <!-- Quiet on purpose: these pages have to be reachable from anywhere, and
       from nowhere in particular. -->
  <footer class="mt-12 border-t border-default px-4 py-6">
    <nav class="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-2">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="text-sm text-dimmed underline-offset-4 transition-colors hover:text-default hover:underline"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>
  </footer>
</template>
