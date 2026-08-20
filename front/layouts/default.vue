<template>
  <UiAppShell>
    <template #header>
      <MenuHeader />
    </template>
    <slot />

    <BugReportButton />
    <BugReportDialog />
    <template #footer>
      <MenuBottomNav />
    </template>
  </UiAppShell>
</template>
