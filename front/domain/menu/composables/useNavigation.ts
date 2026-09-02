export type NavigationEntry = {
  to: string;
  label: string;
  icon: string;
  // Kept in the mobile bar itself rather than tucked behind "Plus" — the
  // four things reached for most: today, the week, the shopping list and
  // building next week. Everything else still has a route, just one tap deeper.
  primary: boolean;
};

export const useNavigation = (): {
  entries: ComputedRef<NavigationEntry[]>;
  primaryEntries: ComputedRef<NavigationEntry[]>;
  moreEntries: ComputedRef<NavigationEntry[]>;
  isCurrent: (to: string) => boolean;
} => {
  const { t } = useNuxtApp().$i18n;
  const localePath = useLocalePath();
  const route = useRoute();

  const entries = computed((): NavigationEntry[] => [
    {
      to: localePath('/aujourdhui'),
      label: t('today.nav'),
      icon: 'i-lucide-sun-medium',
      primary: true,
    },
    {
      to: localePath('/'),
      label: t('menu.nav.week'),
      icon: 'i-lucide-calendar-days',
      primary: true,
    },
    {
      to: localePath('/recettes'),
      label: t('library.nav'),
      icon: 'i-lucide-book-open',
      primary: false,
    },
    {
      to: localePath('/batch'),
      label: t('menu.nav.batch'),
      icon: 'i-lucide-chef-hat',
      primary: false,
    },
    {
      to: localePath('/courses'),
      label: t('menu.nav.shopping'),
      icon: 'i-lucide-shopping-basket',
      primary: true,
    },
    {
      to: localePath('/composer'),
      label: t('planner.nav'),
      icon: 'i-lucide-square-pen',
      primary: true,
    },
    {
      to: localePath('/poids'),
      label: t('weight.nav'),
      icon: 'i-lucide-scale',
      primary: false,
    },
    {
      to: localePath('/progression'),
      label: t('insights.nav'),
      icon: 'i-lucide-line-chart',
      primary: false,
    },
    {
      to: localePath('/profil'),
      label: t('profile.nav'),
      icon: 'i-lucide-user-round',
      primary: false,
    },
  ]);

  // Trailing slash included: the prerendered pages are served as /courses/, so
  // a bare comparison would never match and nothing would ever read as current.
  const isCurrent = (to: string): boolean => route.path === to || route.path === `${to}/`;

  return {
    entries,
    primaryEntries: computed((): NavigationEntry[] =>
      entries.value.filter((entry): boolean => entry.primary),
    ),
    moreEntries: computed((): NavigationEntry[] =>
      entries.value.filter((entry): boolean => !entry.primary),
    ),
    isCurrent,
  };
};
