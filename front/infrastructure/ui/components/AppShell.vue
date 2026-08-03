<template>
  <div class="flex min-h-screen flex-col bg-default text-default">
    <a href="#content" class="skip-link">{{ $t('accessibility.skipToContent') }}</a>
    <slot name="header" />
    <!-- Bottom padding clears the mobile navigation bar. -->
    <main id="content" class="flex-1 pb-24 sm:pb-16">
      <slot />
    </main>
    <slot name="footer" />
  </div>
</template>
