<script setup lang="ts">
const { entries, isCurrent } = useNavigation();
</script>

<template>
  <!-- Below the desktop breakpoint the five destinations sit in a thumb-reach
       bar; the header spells them out from lg up. Five fit a bar outright, so
       there is no "more" tab hiding anything any longer. -->
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-default/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
    :aria-label="$t('accessibility.mainNavigation')"
  >
    <ul class="flex">
      <li v-for="entry in entries" :key="entry.to" class="flex-1">
        <NuxtLink
          :to="entry.to"
          class="flex flex-col items-center gap-1 py-2.5 transition-colors"
          :class="isCurrent(entry.to) ? 'text-primary' : 'text-muted'"
          :aria-current="isCurrent(entry.to) ? 'page' : undefined"
        >
          <UIcon :name="entry.icon" class="size-6" />
          <span class="text-[0.7rem] font-medium">{{ entry.label }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
