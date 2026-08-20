<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

const { locale, locales, setLocale, t } = useNuxtApp().$i18n;
const localePath = useLocalePath();
const colorMode = useColorMode();
const { entries } = useNavigation();
const route = useRoute();
const { user, signOut } = useAuth();
const { profile } = useProfile();
const { goalLabelOf } = useProfileSummary();

// Someone's own goal when they have said what it is, a plain description of the
// app otherwise. Announcing "Prise de masse" to a reader who is losing weight
// is worse than saying nothing at all.
const tagline = computed((): string =>
  profile.value === undefined ? t('menu.tagline') : goalLabelOf(profile.value),
);

// Initials, because nothing else identifies the account at a glance and the
// name is not always there — a Google account without one still has an address.
const initials = computed((): string => {
  const source = user.value?.name ?? user.value?.email ?? '';
  const words = source.split(/[\s@.]+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word): string => word.charAt(0).toUpperCase())
    .join('');
});

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

const { open: openBugReport } = useBugReport();
const { isAdmin } = useAdmin();

// Built here rather than in the template so the admin entry can simply not
// exist for everybody else, instead of being rendered and hidden.
const accountItems = computed((): DropdownMenuItem[][] => [
  [{ label: user.value?.name ?? user.value?.email ?? '', type: 'label' as const }],
  [
    { label: t('bugReport.open'), icon: 'i-lucide-bug', onSelect: openBugReport },
    ...(isAdmin.value
      ? [
          {
            label: t('bugReport.admin.title'),
            icon: 'i-lucide-list-checks',
            to: localePath('/signalements'),
          },
        ]
      : []),
  ],
  [{ label: t('auth.signOut'), icon: 'i-lucide-log-out', onSelect: signOut }],
]);

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
        <!-- The favicon itself, not a lookalike: the header, the browser tab,
             the installed app and a shared link all showed a different mark,
             and the one people recognise is the one on their home screen.
             Pointing at the file is what keeps them from drifting apart again. -->
        <img
          src="/favicon.svg"
          alt=""
          aria-hidden="true"
          width="36"
          height="36"
          class="size-9 shrink-0 transform-gpu rounded-xl transition-transform duration-300 will-change-transform group-hover:-rotate-12 group-hover:scale-110"
        />
        <span class="min-w-0 leading-tight">
          <span class="block truncate text-sm font-bold sm:text-base">
            {{ $t('menu.brand') }}
          </span>
          <span class="hidden truncate text-xs text-muted sm:block">{{ tagline }}</span>
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

        <!-- Being signed in was invisible: the only way to find out was to open
             the profile page and see whether it asked you to sign in. -->
        <ClientOnly>
          <!-- The avatar became a menu when there was more than one thing to
               do with an account. Reporting a problem lives here as the calm
               path; the floating button is the one you reach for mid-problem. -->
          <UDropdownMenu v-if="user !== undefined" :items="accountItems">
            <UButton variant="ghost" color="neutral" size="sm" :aria-label="$t('auth.account')">
              <UAvatar
                :alt="user.name ?? user.email"
                :text="initials"
                size="sm"
                :ui="{ root: 'bg-primary/15 text-primary font-bold' }"
              />
            </UButton>
          </UDropdownMenu>
          <template #fallback>
            <USkeleton class="size-8 rounded-full" />
          </template>
        </ClientOnly>
      </div>
    </div>
  </header>
</template>
