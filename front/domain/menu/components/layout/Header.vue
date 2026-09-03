<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

const { locale, locales, setLocale, t } = useNuxtApp().$i18n;
const localePath = useLocalePath();
const colorMode = useColorMode();
const { entries, isCurrent } = useNavigation();
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
const { open: openImprovement } = useImprovement();
const { isAdmin } = useAdmin();

// The profile is not a standing tab any more: reached from the avatar, where an
// account's own settings belong. Built here rather than in the template so the
// admin entries can simply not exist for everybody else.
const accountItems = computed((): DropdownMenuItem[][] => [
  [{ label: user.value?.name ?? user.value?.email ?? '', type: 'label' as const }],
  [{ label: t('profile.nav'), icon: 'i-lucide-user-round', to: localePath('/profil') }],
  [
    { label: t('improvement.open'), icon: 'i-lucide-lightbulb', onSelect: openImprovement },
    { label: t('bugReport.open'), icon: 'i-lucide-bug', onSelect: openBugReport },
    ...(isAdmin.value
      ? [
          {
            label: t('bugReport.admin.title'),
            icon: 'i-lucide-list-checks',
            to: localePath('/signalements'),
          },
          {
            label: t('improvement.admin.title'),
            icon: 'i-lucide-sparkles',
            to: localePath('/ameliorations'),
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

const isDisplayPreferencesOpen = ref(false);
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
             and the one people recognise is the one on their home screen. -->
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

      <!-- Five destinations spell out in full on a desktop header. On phones and
           tablets the same five live in the bottom bar, within thumb reach. -->
      <nav
        class="ml-auto hidden items-center gap-1 lg:flex"
        :aria-label="$t('accessibility.mainNavigation')"
      >
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

      <div class="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
        <UButton
          icon="i-lucide-accessibility"
          :aria-label="$t('displayPreferences.open')"
          variant="ghost"
          color="neutral"
          @click="isDisplayPreferencesOpen = true"
        />
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
          <!-- Signed out, the way back in: the profile moved into the avatar
               menu, which does not exist until you are signed in, so without
               this a signed-out reader had no visible door to sign-in at all.
               It leads to the profile page, which is where the sign-in form
               lives. -->
          <UButton
            v-else
            :to="localePath('/profil')"
            icon="i-lucide-log-in"
            color="primary"
            variant="soft"
            size="sm"
            class="font-semibold"
          >
            {{ $t('auth.signIn') }}
          </UButton>
          <template #fallback>
            <USkeleton class="size-8 rounded-full" />
          </template>
        </ClientOnly>
      </div>
    </div>
  </header>

  <UiDisplayPreferencesDialog v-model="isDisplayPreferencesOpen" />
</template>
