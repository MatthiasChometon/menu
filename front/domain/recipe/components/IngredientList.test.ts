import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import IngredientList from './IngredientList.vue';

const targets = { kcal: 3150, protein: 165, fat: 80, carbs: 445, fiber: 56 };

const eater = (id: string, name: string): Eater => ({ id, name, targets });

const rice = {
  id: 'brownRice',
  name: { fr: 'Riz complet', en: 'Brown rice' },
  unit: 'g',
  aisle: 'grocery',
  icon: 'i-lucide-wheat',
  kcal: 350,
  protein: 7,
  fat: 3,
  carbs: 73,
  fiber: 3,
  pricePerKg: 2,
} as unknown as SharedQuantity['food'];

const shared = (perEater: SharedQuantity['perEater']): SharedQuantity[] => [
  {
    food: rice,
    total: perEater.reduce((sum, { grams }): number => sum + grams, 0),
    perEater,
  },
];

const mount = (quantities: SharedQuantity[]): ReturnType<typeof mountSuspended> =>
  mountSuspended(IngredientList, { props: { quantities } });

describe('reading an ingredient the household shares', () => {
  it('shows what goes in the pan, not one person share', async () => {
    const wrapper = await mount(
      shared([
        { eater: eater('me', 'Matthias'), grams: 120 },
        { eater: eater('mum', 'Maman'), grams: 80 },
      ]),
    );

    expect(wrapper.text()).toContain('200');
  });

  it('keeps each portion behind a fold until it is asked for', async () => {
    const wrapper = await mount(
      shared([
        { eater: eater('me', 'Matthias'), grams: 120 },
        { eater: eater('mum', 'Maman'), grams: 80 },
      ]),
    );

    // A phone held over a pan has room for one number. The others exist, but
    // they are wanted at serving time, not while cooking.
    expect(wrapper.text()).not.toContain('Maman');

    await wrapper.find('button[aria-controls^="shares-"]').trigger('click');

    expect(wrapper.text()).toContain('Matthias');
    expect(wrapper.text()).toContain('Maman');
    expect(wrapper.text()).toContain('120');
    expect(wrapper.text()).toContain('80');
  });

  it('offers no fold when one person is eating', async () => {
    const wrapper = await mount(shared([{ eater: eater('me', 'Matthias'), grams: 140 }]));

    // The total IS their portion. A fold repeating the number above it would be
    // noise dressed up as information — and this is what the page shows today.
    expect(wrapper.findAll('button[aria-controls^="shares-"]')).toHaveLength(0);
    expect(wrapper.text()).toContain('140');
  });

  it('offers no fold when nobody has answered a profile', async () => {
    const wrapper = await mount([{ food: rice, total: 140, perEater: [] }]);

    expect(wrapper.findAll('button[aria-controls^="shares-"]')).toHaveLength(0);
    expect(wrapper.text()).toContain('140');
  });

  it('still names everyone when the household is five', async () => {
    const names = ['Matthias', 'Maman', 'Papa', 'Léa', 'Tom'];
    const wrapper = await mount(
      shared(
        names.map((name, index): SharedQuantity['perEater'][number] => ({
          eater: eater(String(index), name),
          grams: 60 + index * 10,
        })),
      ),
    );

    await wrapper.find('button[aria-controls^="shares-"]').trigger('click');

    for (const name of names) expect(wrapper.text()).toContain(name);
    // 60 + 70 + 80 + 90 + 100
    expect(wrapper.text()).toContain('400');
  });
});

describe('substituting an ingredient in a pinch', () => {
  const chickenBreast = {
    id: 'chickenBreast',
    name: { fr: 'Blanc de poulet', en: 'Chicken breast' },
    unit: 'g',
    aisle: 'butcher',
    icon: 'i-lucide-drumstick',
    kcal: 110,
    protein: 23,
    fat: 1.5,
    carbs: 0,
    fiber: 0,
    pricePerKg: 9.5,
  } as unknown as SharedQuantity['food'];

  it('keeps the alternatives folded until asked for', async () => {
    const wrapper = await mount([{ food: chickenBreast, total: 150, perEater: [] }]);

    expect(wrapper.text()).not.toContain('Filet de dinde');
  });

  it('suggests the closest match from the same aisle, with an equivalent weight', async () => {
    const wrapper = await mount([{ food: chickenBreast, total: 150, perEater: [] }]);

    await wrapper.find('button[aria-controls^="substitutes-"]').trigger('click');

    // Turkey breast sits right next to chicken breast in the catalogue's
    // macros, and both are shelved under "butcher".
    expect(wrapper.text()).toContain('Filet de dinde');
  });
});
