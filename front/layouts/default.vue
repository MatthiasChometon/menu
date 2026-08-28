<template>
  <UiAppShell>
    <template #header>
      <MenuHeader />
    </template>
    <slot />

    <LegalFooter />

    <BugReportButton />
    <BugReportDialog />
    <ImprovementRequestButton />
    <ImprovementRequestDialog />
    <template #footer>
      <MenuBottomNav />
    </template>
  </UiAppShell>
</template>
