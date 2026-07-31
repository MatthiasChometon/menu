<template>
  <div class="flex min-h-screen flex-col bg-default text-default">
    <a href="#content" class="skip-link">{{ $t('accessibility.skipToContent') }}</a>
    <slot name="header" />
    <main id="content" class="flex-1 pb-16">
      <slot />
    </main>
    <slot name="footer" />
  </div>
</template>
