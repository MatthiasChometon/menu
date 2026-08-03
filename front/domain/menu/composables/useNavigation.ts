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
      { to: localePath('/'), label: t('menu.nav.week'), icon: 'i-lucide-calendar-days' },
      { to: localePath('/batch'), label: t('menu.nav.batch'), icon: 'i-lucide-chef-hat' },
      {
        to: localePath('/courses'),
        label: t('menu.nav.shopping'),
        icon: 'i-lucide-shopping-basket',
      },
      { to: localePath('/profil'), label: t('profile.nav'), icon: 'i-lucide-user-round' },
    ]),
  };
};
