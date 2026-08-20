<template>
  <UiAppShell>
    <template #header>
      <MenuHeader />
    </template>
    <slot />

    <LegalFooter />

    <BugReportButton />
    <BugReportDialog />
    <template #footer>
      <MenuBottomNav />
    </template>
  </UiAppShell>
</template>
