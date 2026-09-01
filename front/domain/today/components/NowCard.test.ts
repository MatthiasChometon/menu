import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import NowCard from './NowCard.vue';

const buildRecipe = (id: string, name: string): Recipe => ({
  id,
  slot: 'main',
  name: { fr: name, en: name },
  prepMinutes: 20,
  batch: true,
  ingredients: {},
  seasonings: [],
  steps: { fr: [], en: [] },
});

const buildMeal = (slot: MealSlot, recipe: Recipe): Meal => ({
  slot,
  recipe,
  quantities: [],
  macros: { kcal: 540, protein: 42, fat: 12, carbs: 55, fiber: 8 },
  portionRatio: 1,
});

describe('the now card', () => {
  it('names the featured meal, its slot, and what it brings', async () => {
    const featuredMeal = {
      day: 'monday' as const,
      meal: buildMeal('lunch', buildRecipe('chiliChicken', 'Chili con carne')),
    };

    const wrapper = await mountSuspended(NowCard, {
      props: { featuredMeal, isCurrent: true },
    });

    expect(wrapper.text()).toContain('Chili con carne');
    expect(wrapper.text()).toContain('540');
    expect(wrapper.text()).toContain('42');
  });

  it('says it is under way when the slot has started', async () => {
    const featuredMeal = {
      day: 'monday' as const,
      meal: buildMeal('breakfast', buildRecipe('fullShaker', 'Shaker')),
    };

    const wrapper = await mountSuspended(NowCard, {
      props: { featuredMeal, isCurrent: true },
    });

    expect(wrapper.text()).toContain('En ce moment');
  });

  it('says it is up next when nothing has started yet', async () => {
    const featuredMeal = {
      day: 'monday' as const,
      meal: buildMeal('breakfast', buildRecipe('fullShaker', 'Shaker')),
    };

    const wrapper = await mountSuspended(NowCard, {
      props: { featuredMeal, isCurrent: false },
    });

    expect(wrapper.text()).toContain('À suivre');
  });

  it('previews the meal that follows, when there is one', async () => {
    const featuredMeal = {
      day: 'monday' as const,
      meal: buildMeal('lunch', buildRecipe('chiliChicken', 'Chili con carne')),
    };
    const upcomingMeal = {
      day: 'monday' as const,
      meal: buildMeal('snack', buildRecipe('yogurtBowl', 'Bol de yaourt')),
    };

    const wrapper = await mountSuspended(NowCard, {
      props: { featuredMeal, upcomingMeal, isCurrent: true },
    });

    expect(wrapper.text()).toContain('Bol de yaourt');
  });

  it('shows no preview when nothing follows today', async () => {
    const featuredMeal = {
      day: 'monday' as const,
      meal: buildMeal('dinner', buildRecipe('chiliChicken', 'Chili con carne')),
    };

    const wrapper = await mountSuspended(NowCard, {
      props: { featuredMeal, isCurrent: true },
    });

    expect(wrapper.text()).not.toContain('Ensuite');
  });
});
