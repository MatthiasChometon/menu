<template>
  <!-- No background of its own: the body paints the tinted canvas and the two
       soft forest veils behind everything (in main.css, as ::before/::after so
       a decorative layer never trips the layout guards). Cards, header and
       inputs keep Nuxt UI's surface (--ui-bg). -->
  <div class="flex min-h-screen flex-col text-default">
    <a href="#content" class="skip-link">{{ $t('accessibility.skipToContent') }}</a>
    <slot name="header" />
    <!-- Bottom padding clears the bottom navigation bar, which now runs up to
         the desktop breakpoint (lg), where the header takes over. -->
    <main id="content" class="flex-1 pb-24 lg:pb-8">
      <slot />
    </main>
    <slot name="footer" />
  </div>
</template>
