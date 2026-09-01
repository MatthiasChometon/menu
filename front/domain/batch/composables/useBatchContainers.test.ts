import { describe, expect, it } from 'vitest';

const menuOf = (): Menu => {
  const { latestMenu } = useMenu();
  if (latestMenu === undefined) throw new Error('no menu to check');

  return latestMenu;
};

const groupsOf = (): ContainerGroup[] => {
  const menu = menuOf();
  const { tasks } = useBatchPlan().planOf(menu);

  return useBatchContainers().groupsOf(menu, tasks);
};

describe('useBatchContainers', () => {
  it('labels one box per serving the week asks of the dish', () => {
    const menu = menuOf();
    const { tasks } = useBatchPlan().planOf(menu);

    for (const group of groupsOf()) {
      const task = tasks.find((entry): boolean => entry.recipe.id === group.recipe.id);

      expect(group.labels.length, group.recipe.id).toBe(task?.servings);
    }
  });

  it('keeps every label pointing at the day and slot it is actually eaten', () => {
    const menu = menuOf();

    for (const group of groupsOf()) {
      for (const label of group.labels) {
        const day = menu.days.find((entry): boolean => entry.key === label.day);
        const meal = day?.meals.find(
          (entry): boolean => entry.slot === label.slot && entry.recipe.id === label.recipe.id,
        );

        expect(meal, `${group.recipe.id} on ${label.day} ${label.slot}`).toBeDefined();
      }
    }
  });

  it('dates every box on or after the week it is cooked for', () => {
    const menu = menuOf();
    const weekStart = new Date(`${menu.weekOf}T00:00:00`).getTime();

    for (const group of groupsOf()) {
      for (const label of group.labels) {
        expect(new Date(`${label.bestBefore}T00:00:00`).getTime()).toBeGreaterThanOrEqual(
          weekStart,
        );
      }
    }
  });

  it('never mixes another dish into a group', () => {
    for (const group of groupsOf()) {
      expect(group.labels.every((label): boolean => label.recipe.id === group.recipe.id)).toBe(
        true,
      );
    }
  });
});
