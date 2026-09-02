<script setup lang="ts">
const { primaryEntries, moreEntries, isCurrent } = useNavigation();

const isMoreOpen = ref(false);

const isInMore = computed((): boolean =>
  moreEntries.value.some((entry): boolean => isCurrent(entry.to)),
);
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-default/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg sm:hidden"
    :aria-label="$t('accessibility.mainNavigation')"
  >
    <ul class="flex">
      <li v-for="entry in primaryEntries" :key="entry.to" class="flex-1">
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
      <li class="flex-1">
        <button
          type="button"
          class="flex w-full flex-col items-center gap-1 py-2.5 transition-colors"
          :class="isInMore ? 'text-primary' : 'text-muted'"
          @click="isMoreOpen = true"
        >
          <UIcon name="i-lucide-more-horizontal" class="size-6" />
          <span class="text-[0.7rem] font-medium">{{ $t('menu.nav.more') }}</span>
        </button>
      </li>
    </ul>
  </nav>

  <MenuBottomNavMore v-model="isMoreOpen" />
</template>
