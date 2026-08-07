<script setup lang="ts">
const { locale, locales, setLocale } = useNuxtApp().$i18n;
const localePath = useLocalePath();
const colorMode = useColorMode();
const { entries } = useNavigation();
const route = useRoute();

// Trailing slash included: the prerendered pages are served as /courses/, so a
// bare comparison would never match and the bar would never say where you are.
const isCurrent = (to: string): boolean => route.path === to || route.path === `${to}/`;

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
          <span class="block truncate text-sm font-bold sm:text-base">
            {{ $t('menu.brand') }}
          </span>
          <span class="hidden truncate text-xs text-muted sm:block">{{ $t('menu.tagline') }}</span>
        </span>
      </NuxtLink>

      <!-- On phones the same links live in the bottom bar, within thumb reach. -->
      <nav class="ml-auto hidden items-center gap-1 sm:flex" :aria-label="$t('menu.nav.week')">
        <UButton
          v-for="entry in entries"
          :key="entry.to"
          :to="entry.to"
          :icon="entry.icon"
          :variant="isCurrent(entry.to) ? 'soft' : 'ghost'"
          :color="isCurrent(entry.to) ? 'primary' : 'neutral'"
          :aria-current="isCurrent(entry.to) ? 'page' : undefined"
          :class="isCurrent(entry.to) && 'font-semibold'"
        >
          {{ entry.label }}
        </UButton>
      </nav>

      <div class="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
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
          class="w-24 sm:w-28"
        />
      </div>
    </div>
  </header>
</template>
