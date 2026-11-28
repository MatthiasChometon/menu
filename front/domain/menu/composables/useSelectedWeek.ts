import { weeksFrom } from '../../planner/composables/usePlannerWeek';
import type { Menu, WeekStatus } from '../types/menu.type';

// The week every screen is looking at, and which menu fills it. Held in shared
// state so picking a week on one screen carries to the shopping list, the
// cooking session and the recipes — the app must never show two weeks at once.
//
// What fills it depends on who is reading:
//   - signed out → the example week, so a visitor sees the product in action
//     (this is what has to sell it, so it is the one the page prerenders);
//   - signed in → their own composed week for the chosen week, weighed to their
//     profile; undefined when they have not composed that week yet.
export const useSelectedWeek = (): {
  selectedWeek: Ref<string>;
  /** The weeks a signed-in reader can move between: this one and the ones ahead. */
  weekOptions: ComputedRef<string[]>;
  selectedMenu: ComputedRef<Menu | undefined>;
  /** The menu on screen is the example, not the reader's own composition. */
  isDemo: ComputedRef<boolean>;
  /** The reader's own week is still being fetched. */
  isLoading: ComputedRef<boolean>;
  /** Fetching the reader's own week failed. */
  hasFailed: ComputedRef<boolean>;
  /** Fetch the week again after a failure. */
  retry: () => Promise<void>;
  isThisWeek: ComputedRef<boolean>;
  statusOfSelected: ComputedRef<WeekStatus | undefined>;
} => {
  const { menus } = useMenu();
  const { menuFor } = useComposedMenu();
  const { isWithin, statusOf } = useWeekStatus();
  const { user } = useAuth();
  const { profile } = useProfile();

  // The example week the app ships with, shown to anybody not signed in.
  const demoMenu = computed((): Menu | undefined => menus[0]);

  // Today is knowable only in the browser. Shared so the several components
  // asking do not each fight over it.
  const now = useState<Date | undefined>('menu:now', (): undefined => undefined);
  onMounted((): void => {
    if (now.value === undefined) now.value = new Date();
  });

  const selectedWeek = useState<string>('menu:selectedWeek', (): string => '');
  // Once the date is known, land on this week. Left blank on a prerendered page,
  // which shows the example regardless of the week.
  watch(
    now,
    (value): void => {
      if (value !== undefined && selectedWeek.value === '') selectedWeek.value = startOf(value);
    },
    { immediate: true },
  );

  const weekOptions = computed((): string[] =>
    now.value === undefined ? [] : weeksFrom(now.value),
  );

  // Only a signed-in reader's own week is fetched. The example is built from the
  // catalogues every page already loads before it hydrates, so it is not put in
  // the page payload as well: that copy was 20 KB gzipped on /recettes.
  const {
    data: ownMenu,
    pending: isLoading,
    error,
    refresh,
  } = useAsyncData<Menu | undefined>(
    'menu:shown',
    async (): Promise<Menu | undefined> => {
      if (user.value === undefined || profile.value === undefined) return undefined;

      return menuFor(selectedWeek.value);
    },
    { watch: [user, profile, selectedWeek], default: (): undefined => undefined },
  );

  const selectedMenu = computed((): Menu | undefined =>
    user.value === undefined ? demoMenu.value : ownMenu.value,
  );

  return {
    selectedWeek,
    weekOptions,
    selectedMenu,
    isDemo: computed((): boolean => user.value === undefined && selectedMenu.value !== undefined),
    isLoading: computed((): boolean => isLoading.value),
    hasFailed: computed((): boolean => error.value !== undefined),
    retry: refresh,
    isThisWeek: computed(
      (): boolean =>
        now.value !== undefined &&
        selectedMenu.value !== undefined &&
        isWithin(selectedMenu.value.weekOf, now.value),
    ),
    statusOfSelected: computed((): WeekStatus | undefined =>
      now.value === undefined || selectedMenu.value === undefined
        ? undefined
        : statusOf(selectedMenu.value.weekOf, now.value),
    ),
  };
};
