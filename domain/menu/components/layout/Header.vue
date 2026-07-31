<script setup lang="ts">
const { t, locale, locales, setLocale } = useNuxtApp().$i18n;
const localePath = useLocalePath();
const colorMode = useColorMode();

const languageItems = computed((): SelectItem[] =>
  locales.value.map((entry): SelectItem => ({
    label: entry.name ?? entry.code,
    value: entry.code,
  })),
);

const currentLocale = computed({
  get: (): string => locale.value,
  set: (value: string): void => {
    const match = locales.value.find((entry): boolean => entry.code === value);
    if (match !== undefined) setLocale(match.code);
  },
});

const isDark = computed({
  get: (): boolean => colorMode.value === 'dark',
  set: (value: boolean): void => {
    colorMode.preference = value ? 'dark' : 'light';
  },
});

const navigation = computed((): { to: string; label: string; icon: string }[] => [
  { to: localePath('/'), label: t('menu.nav.week'), icon: 'i-lucide-calendar-days' },
  { to: localePath('/courses'), label: t('menu.nav.shopping'), icon: 'i-lucide-shopping-basket' },
]);
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-default bg-default/85 backdrop-blur-lg"
    role="banner"
  >
    <div class="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
      <NuxtLink :to="localePath('/')" class="group flex min-w-0 items-center gap-2.5">
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110"
        >
          <UIcon name="i-lucide-utensils-crossed" class="size-5" />
        </span>
        <span class="min-w-0 leading-tight">
          <span class="block truncate font-bold">{{ $t('menu.brand') }}</span>
          <span class="block truncate text-xs text-muted">{{ $t('menu.tagline') }}</span>
        </span>
      </NuxtLink>

      <nav class="ml-auto flex items-center gap-1" :aria-label="$t('menu.nav.week')">
        <UButton
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          :icon="item.icon"
          variant="ghost"
          color="neutral"
          class="hidden sm:inline-flex"
        >
          {{ item.label }}
        </UButton>
        <UButton
          v-for="item in navigation"
          :key="`compact-${item.to}`"
          :to="item.to"
          :icon="item.icon"
          :aria-label="item.label"
          variant="ghost"
          color="neutral"
          class="sm:hidden"
        />
      </nav>

      <div class="flex items-center gap-1">
        <UButton
          :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
          :aria-label="$t('accessibility.toggleTheme')"
          :aria-pressed="isDark"
          variant="ghost"
          color="neutral"
          @click="isDark = !isDark"
        />
        <USelect
          v-model="currentLocale"
          :items="languageItems"
          value-key="value"
          :aria-label="$t('accessibility.selectLanguage')"
          size="sm"
          class="w-28"
        />
      </div>
    </div>
  </header>
</template>
