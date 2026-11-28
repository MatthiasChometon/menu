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

const languageItems = computed((): { label: string; value: string }[] =>
  locales.value.map((entry): { label: string; value: string } => ({
    label: entry.name ?? entry.code,
    value: entry.code,
  })),
);

const { reportError } = useErrorReporting();

const currentLocale = computed({
  get: (): string => locale.value,
  set: (value: string): void => {
    const match = locales.value.find((entry): boolean => entry.code === value);
    if (match === undefined) return;
    setLocale(match.code).catch((failure: unknown): void => reportError('menu:setLocale', failure));
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
// Fetched the first time the button is pressed rather than with every page.
const displayPreferencesOpened = useOpenedOnce(isDisplayPreferencesOpen);
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-default bg-default" role="banner">
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
        <UiPlainButton
          v-for="entry in entries"
          :key="entry.to"
          :to="entry.to"
          :variant="isCurrent(entry.to) ? 'soft' : 'ghost'"
          :color="isCurrent(entry.to) ? 'primary' : 'neutral'"
          :aria-current="isCurrent(entry.to) ? 'page' : undefined"
          :class="isCurrent(entry.to) && 'font-semibold'"
        >
          <UIcon :name="entry.icon" class="size-5 shrink-0" />
          {{ entry.label }}
        </UiPlainButton>
      </nav>

      <!-- 36 px whatever sits at its end: the account avatar is taller than the
           skeleton standing in for it and than the sign-in button, and the header
           growing by the difference pushed the whole page down once the session
           was known. -->
      <div class="ml-auto flex min-h-9 shrink-0 items-center gap-1 lg:ml-0">
        <UiPlainButton
          square
          :aria-label="$t('displayPreferences.open')"
          variant="ghost"
          color="neutral"
          @click="isDisplayPreferencesOpen = true"
        >
          <UIcon name="i-lucide-accessibility" class="size-5 shrink-0" />
        </UiPlainButton>
        <UiPlainButton
          square
          :aria-label="$t('accessibility.toggleTheme')"
          :aria-pressed="isDark"
          variant="ghost"
          color="neutral"
          @click="isDark = !isDark"
        >
          <UIcon :name="isDark ? 'i-lucide-moon' : 'i-lucide-sun'" class="size-5 shrink-0" />
        </UiPlainButton>
        <!-- A native select: the browser's own list, announced and operated the
             same way, and none of the dropdown code Nuxt UI's select brings (about
             25 KB of script on every page for a control used once). -->
        <span class="relative inline-block w-24 sm:w-28">
          <select
            v-model="currentLocale"
            :aria-label="$t('accessibility.selectLanguage')"
            class="h-8 w-full cursor-pointer appearance-none rounded-md bg-default py-1 pl-2.5 pr-7 text-sm text-highlighted ring ring-inset ring-accented focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option v-for="item in languageItems" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
          <UIcon
            name="i-lucide-chevron-down"
            class="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-dimmed"
            aria-hidden="true"
          />
        </span>

        <!-- Being signed in was invisible: the only way to find out was to open
             the profile page and see whether it asked you to sign in. -->
        <ClientOnly>
          <LazyUDropdownMenu v-if="user !== undefined" :items="accountItems">
            <UiPlainButton
              variant="ghost"
              color="neutral"
              size="sm"
              class="size-9 justify-center p-0"
              :aria-label="$t('auth.account')"
            >
              <LazyUAvatar
                :alt="user.name ?? user.email"
                :text="initials"
                size="sm"
                :ui="{ root: 'bg-primary/15 text-primary font-bold' }"
              />
            </UiPlainButton>
          </LazyUDropdownMenu>
          <!-- Signed out, the way back in: the profile moved into the avatar
               menu, which does not exist until you are signed in, so without
               this a signed-out reader had no visible door to sign-in at all.
               It leads to the profile page, which is where the sign-in form
               lives. -->
          <UiPlainButton
            v-else
            :to="localePath('/profil')"
            color="primary"
            variant="soft"
            size="sm"
            class="font-semibold"
          >
            <UIcon name="i-lucide-log-in" class="size-4 shrink-0" />
            {{ $t('auth.signIn') }}
          </UiPlainButton>
          <template #fallback>
            <span class="block size-9 animate-pulse rounded-full bg-elevated" />
          </template>
        </ClientOnly>
      </div>
    </div>
  </header>

  <LazyUiDisplayPreferencesDialog
    v-if="displayPreferencesOpened"
    v-model="isDisplayPreferencesOpen"
  />
</template>
