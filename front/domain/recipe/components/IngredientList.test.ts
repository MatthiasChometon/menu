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

    await wrapper.find('button').trigger('click');

    expect(wrapper.text()).toContain('Matthias');
    expect(wrapper.text()).toContain('Maman');
    expect(wrapper.text()).toContain('120');
    expect(wrapper.text()).toContain('80');
  });

  it('offers no fold when one person is eating', async () => {
    const wrapper = await mount(shared([{ eater: eater('me', 'Matthias'), grams: 140 }]));

    // The total IS their portion. A fold repeating the number above it would be
    // noise dressed up as information — and this is what the page shows today.
    expect(wrapper.findAll('button')).toHaveLength(0);
    expect(wrapper.text()).toContain('140');
  });

  it('offers no fold when nobody has answered a profile', async () => {
    const wrapper = await mount([{ food: rice, total: 140, perEater: [] }]);

    expect(wrapper.findAll('button')).toHaveLength(0);
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

    await wrapper.find('button').trigger('click');

    for (const name of names) expect(wrapper.text()).toContain(name);
    // 60 + 70 + 80 + 90 + 100
    expect(wrapper.text()).toContain('400');
  });
});
