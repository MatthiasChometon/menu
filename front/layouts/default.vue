<template>
  <UiAppShell>
    <template #header>
      <MenuHeader />
    </template>
    <slot />

    <LegalFooter />

    <BugReportButton />
    <BugReportDialog />
    <ImprovementRequestDialog />
    <template #footer>
      <MenuBottomNav />
    </template>
  </UiAppShell>
</template>
