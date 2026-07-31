import { renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Item from './Item.vue';

const line: ShoppingLine = {
  food: {
    id: 'banana',
    name: { fr: 'Bananes', en: 'Bananas' },
    aisle: 'produce',
    icon: 'i-lucide-banana',
    unit: 'g',
    kcal: 90,
    protein: 1.1,
    fat: 0.3,
    carbs: 20,
    fiber: 2.6,
    pricePerKg: 2,
    pieceWeight: 120,
    piece: { fr: 'bananes', en: 'bananas' },
    pieceOne: { fr: 'banane', en: 'banana' },
  },
  grams: 1720,
  price: 3.44,
};

// The i18n locale is shared across the test app, so each file pins the one it
// asserts on instead of inheriting whatever ran before.
beforeEach(async () => {
  await useNuxtApp().$i18n.setLocale('fr');
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ShoppingItem', () => {
  it('shows what to buy, how much and roughly how many', async () => {
    await renderSuspended(Item, { props: { line } });

    expect(screen.getByText('Bananes')).toBeTruthy();
    expect(screen.getByText('1,72 kg')).toBeTruthy();
    expect(screen.getByText(/14 bananes/)).toBeTruthy();
  });

  it('shows the estimated price so the budget stays visible in the aisle', async () => {
    await renderSuspended(Item, { props: { line } });

    expect(screen.getByText(/3\.44/)).toBeTruthy();
  });

  it('asks to be toggled when tapped', async () => {
    const { emitted } = await renderSuspended(Item, { props: { line } });

    await fireEvent.click(screen.getByRole('button'));

    expect(emitted()).toHaveProperty('toggle');
  });

  it('reports its picked state to assistive technology', async () => {
    await renderSuspended(Item, { props: { line, picked: true } });

    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  });

  it('is not pressed until it is picked', async () => {
    await renderSuspended(Item, { props: { line } });

    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
  });
});
