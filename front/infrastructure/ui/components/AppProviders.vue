<script setup lang="ts">
import { portalTargetInjectionKey } from '#ui/composables/usePortal';
import type { Locale, Messages } from '@nuxt/ui';

// What the Nuxt UI components read from `UApp`, and nothing else. `UApp` also imports the toaster
// (with the button, avatar, tailwind-variants and tailwind-merge it uses) and reka's tooltip and
// config providers: about 70 KB of the entry chunk for providers this app does not use. The
// toaster is mounted by `app.vue` when the first toast is pushed; no tooltip is drawn anywhere.
const { locale } = defineProps<{ locale: Locale<Messages> }>();

// The key is the one `useLocale` injects, shared by name so it needs no import from the package.
provide(
  Symbol.for('nuxt-ui.locale-context'),
  toRef((): Locale<Messages> => locale),
);
// Modals, menus and the like teleport to the body, as under `UApp`.
provide(
  portalTargetInjectionKey,
  toRef((): string => 'body'),
);
</script>

<template>
  <slot />
</template>
