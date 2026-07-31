<template>
  <UiAppShell>
    <template #header>
      <MenuHeader />
    </template>
    <slot />
    <template #footer>
      <MenuBottomNav />
    </template>
  </UiAppShell>
</template>
