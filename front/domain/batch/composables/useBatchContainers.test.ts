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

  it('dates each box on the calendar day it is eaten, across the clock change', () => {
    const menu = { ...menuOf(), weekOf: '2026-10-24' };
    const { tasks } = useBatchPlan().planOf(menu);
    const week = [
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
    ];
    const labels = useBatchContainers()
      .groupsOf(menu, tasks)
      .flatMap((group): ContainerLabel[] => group.labels);

    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      const dayIndex = menu.days.findIndex((day): boolean => day.key === label.day);
      expect(label.bestBefore, label.id).toBe(week[dayIndex]);
    }
  });

  it('prints a calendar day as itself, whatever the zone of the device', () => {
    const { dateLabelOf } = useBatchContainers();

    expect(dateLabelOf('2026-10-25')).toContain('25');
    expect(dateLabelOf('2026-10-25')).not.toContain('24');
  });

  it('never mixes another dish into a group', () => {
    for (const group of groupsOf()) {
      expect(group.labels.every((label): boolean => label.recipe.id === group.recipe.id)).toBe(
        true,
      );
    }
  });
});
