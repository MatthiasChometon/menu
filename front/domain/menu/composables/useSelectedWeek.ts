// The week every screen is looking at. Held in shared state rather than page
// state: picking next week on the week view has to carry to the shopping list,
// the cooking session and the recipes, or the app shows two different weeks at
// once.
export const useSelectedWeek = (): {
  selectedWeek: Ref<string>;
  selectedMenu: ComputedRef<Menu | undefined>;
  isThisWeek: ComputedRef<boolean>;
  statusOfSelected: ComputedRef<WeekStatus | undefined>;
} => {
  const { menus, menuOf } = useMenu();
  const { weekToShow, isWithin, statusOf } = useWeekStatus();

  // Seeded with the newest week, which is the only choice a prerendered page can
  // make: the build date is not the reader's date.
  const selectedWeek = useState<string>('menu:selectedWeek', (): string => menus[0]?.weekOf ?? '');
  const now = useState<Date | undefined>('menu:now', (): undefined => undefined);

  // Today is knowable only in the browser, so the correction lands after mount.
  // Guarded by the shared date so several components asking for the week do not
  // each fight over it.
  onMounted((): void => {
    if (now.value !== undefined) return;

    const today = new Date();
    now.value = today;

    const week = weekToShow(
      menus.map((menu): string => menu.weekOf),
      today,
    );
    if (week !== undefined) selectedWeek.value = week;
  });

  return {
    selectedWeek,
    selectedMenu: computed((): Menu | undefined => menuOf(selectedWeek.value) ?? menus[0]),
    isThisWeek: computed(
      (): boolean => now.value !== undefined && isWithin(selectedWeek.value, now.value),
    ),
    statusOfSelected: computed((): WeekStatus | undefined =>
      now.value === undefined ? undefined : statusOf(selectedWeek.value, now.value),
    ),
  };
};
