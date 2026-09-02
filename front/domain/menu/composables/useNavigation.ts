export type NavigationEntry = {
  to: string;
  label: string;
  icon: string;
};

// Five destinations, not nine: the places you return to. Composing a week and
// batch-cooking are actions reached in context (from the week and today), not
// standing tabs; the weigh-in and its trends share one "Progrès" destination;
// the profile lives on the avatar menu. What is left is small enough to spell
// out in full on every screen, with no "more" overflow to hide anything.
export const useNavigation = (): {
  entries: ComputedRef<NavigationEntry[]>;
  isCurrent: (to: string) => boolean;
} => {
  const { t } = useNuxtApp().$i18n;
  const localePath = useLocalePath();
  const route = useRoute();

  const entries = computed((): NavigationEntry[] => [
    { to: localePath('/aujourdhui'), label: t('today.nav'), icon: 'i-lucide-sun-medium' },
    { to: localePath('/'), label: t('menu.nav.week'), icon: 'i-lucide-calendar-days' },
    { to: localePath('/courses'), label: t('menu.nav.shopping'), icon: 'i-lucide-shopping-basket' },
    { to: localePath('/progres'), label: t('progress.nav'), icon: 'i-lucide-trending-up' },
    { to: localePath('/recettes'), label: t('library.nav'), icon: 'i-lucide-book-open' },
  ]);

  // Trailing slash included: the prerendered pages are served as /courses/, so a
  // bare comparison would never match and nothing would ever read as current.
  const isCurrent = (to: string): boolean => route.path === to || route.path === `${to}/`;

  return { entries, isCurrent };
};
