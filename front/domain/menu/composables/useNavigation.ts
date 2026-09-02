export type NavigationEntry = {
  to: string;
  label: string;
  icon: string;
};

export const useNavigation = (): { entries: ComputedRef<NavigationEntry[]> } => {
  const { t } = useNuxtApp().$i18n;
  const localePath = useLocalePath();

  return {
    entries: computed((): NavigationEntry[] => [
      { to: localePath('/aujourdhui'), label: t('today.nav'), icon: 'i-lucide-sun-medium' },
      { to: localePath('/'), label: t('menu.nav.week'), icon: 'i-lucide-calendar-days' },
      { to: localePath('/recettes'), label: t('library.nav'), icon: 'i-lucide-book-open' },
      { to: localePath('/batch'), label: t('menu.nav.batch'), icon: 'i-lucide-chef-hat' },
      {
        to: localePath('/courses'),
        label: t('menu.nav.shopping'),
        icon: 'i-lucide-shopping-basket',
      },
      { to: localePath('/composer'), label: t('planner.nav'), icon: 'i-lucide-square-pen' },
      { to: localePath('/poids'), label: t('weight.nav'), icon: 'i-lucide-scale' },
      { to: localePath('/progression'), label: t('insights.nav'), icon: 'i-lucide-line-chart' },
      { to: localePath('/profil'), label: t('profile.nav'), icon: 'i-lucide-user-round' },
    ]),
  };
};
