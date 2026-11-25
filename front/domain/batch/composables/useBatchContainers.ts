import { shiftedBy } from '../../planner/composables/usePlannerWeek';

// menu.days is already in the order the week actually runs (see usePlannerWeek),
// so the day at a given index is exactly that many days after weekOf — no need
// to know which weekday the menu happens to start on.
const labelsOf = (menu: Menu, task: BatchTask): ContainerLabel[] =>
  menu.days.flatMap((day, dayIndex): ContainerLabel[] =>
    day.meals
      .filter((meal): boolean => meal.recipe.id === task.recipe.id)
      .map((meal): ContainerLabel => ({
        id: `${task.recipe.id}:${day.key}:${meal.slot}`,
        recipe: task.recipe,
        day: day.key,
        slot: meal.slot,
        bestBefore: shiftedBy(menu.weekOf, dayIndex),
      })),
  );

export const useBatchContainers = (): {
  groupsOf: (menu: Menu, tasks: BatchTask[]) => ContainerGroup[];
  dateLabelOf: (isoDate: string) => string;
} => {
  const { locale } = useNuxtApp().$i18n;

  return {
    groupsOf: (menu: Menu, tasks: BatchTask[]): ContainerGroup[] =>
      tasks.map((task): ContainerGroup => ({ recipe: task.recipe, labels: labelsOf(menu, task) })),
    dateLabelOf: (isoDate: string): string =>
      // A calendar day, not an instant: read and printed as UTC so that the zone
      // of the device cannot move it to the day before.
      new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(locale.value, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }),
  };
};
