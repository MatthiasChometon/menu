import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../../infrastructure/testing/e2e-app';
import { customFoodConstraints } from './utils';

const OWNER = 'matthias@example.com';
const SOMEBODY_ELSE = 'someone-else@example.com';
const PASSWORD = 'a-long-enough-password';

const FOOD_FIELDS = `id name kcal protein fat carbs fiber pricePerKg`;

const MINE = `query { myCustomFoods { ${FOOD_FIELDS} } }`;

const CREATE = `
  mutation ($input: CustomFoodInput!) {
    createCustomFood(input: $input) { ${FOOD_FIELDS} }
  }
`;

const UPDATE = `
  mutation ($input: UpdateCustomFoodInput!) {
    updateCustomFood(input: $input) { ${FOOD_FIELDS} }
  }
`;

const DELETE = `mutation ($id: ID!) { deleteCustomFood(id: $id) }`;

type Food = {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  pricePerKg: number;
};

const DRAFT = { kcal: 250, protein: 20, fat: 10, carbs: 15, fiber: 2, pricePerKg: 12 };

let api: TestApp;

const create = async (
  session: string,
  name = 'Tofu maison',
  draft: Omit<Food, 'id' | 'name'> = DRAFT,
): Promise<Food> => {
  const response = await api.graphql<{ createCustomFood: Food }>(
    CREATE,
    { input: { name, ...draft } },
    session,
  );

  if (response.data === undefined) throw new Error(response.errors?.[0]?.message);

  return response.data.createCustomFood;
};

beforeAll(async (): Promise<void> => {
  api = await startTestApp();
});

afterAll(async (): Promise<void> => {
  await api.close();
});

beforeEach(async (): Promise<void> => {
  await api.reset();
});

describe('defining a food of one’s own', () => {
  it('is refused to whoever is not signed in', async () => {
    const response = await api.graphql(MINE);

    expect(response.errors?.[0]?.message).toBe('Unauthorized');
  });

  it('cannot be created without a session', async () => {
    const response = await api.graphql(CREATE, { input: { name: 'Tofu', ...DRAFT } });

    expect(response.errors?.[0]?.message).toBe('Unauthorized');
  });

  it('starts empty', async () => {
    const session = await api.signUp(OWNER, PASSWORD);

    const response = await api.graphql<{ myCustomFoods: Food[] }>(MINE, undefined, session);

    expect(response.data?.myCustomFoods).toEqual([]);
  });

  it('is created and comes back', async () => {
    const session = await api.signUp(OWNER, PASSWORD);

    const food = await create(session);

    expect(food.name).toBe('Tofu maison');
    expect(food.kcal).toBe(250);
  });

  it('keeps them in the order they were added', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    await create(session, 'Tofu maison');
    await create(session, 'Houmous maison');

    const response = await api.graphql<{ myCustomFoods: Food[] }>(MINE, undefined, session);

    expect(response.data?.myCustomFoods.map((food): string => food.name)).toEqual([
      'Tofu maison',
      'Houmous maison',
    ]);
  });

  it('refuses a food with no name at all', async () => {
    const session = await api.signUp(OWNER, PASSWORD);

    const response = await api.graphql(CREATE, { input: { name: '  ', ...DRAFT } }, session);

    expect(response.errors?.[0]?.message).toBeDefined();
  });

  it('refuses macros outside a realistic range', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    const { maxKcal } = customFoodConstraints();

    const response = await api.graphql(
      CREATE,
      { input: { name: 'Trop calorique', ...DRAFT, kcal: maxKcal + 1 } },
      session,
    );

    expect(response.errors?.[0]?.message).toBeDefined();
  });

  it('refuses more than a pantry ever holds at once', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    const { maxItems } = customFoodConstraints();
    for (let filled = 0; filled < maxItems; filled += 1) await create(session, `Aliment ${filled}`);

    const response = await api.graphql(CREATE, { input: { name: 'En trop', ...DRAFT } }, session);

    expect(response.errors?.[0]?.message).toContain(String(maxItems));
  });
});

describe('correcting and removing a custom food', () => {
  it('replaces it wholesale', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    const food = await create(session);

    const response = await api.graphql<{ updateCustomFood: Food }>(
      UPDATE,
      { input: { id: food.id, name: 'Tofu fumé', ...DRAFT, kcal: 300 } },
      session,
    );

    expect(response.data?.updateCustomFood.name).toBe('Tofu fumé');
    expect(response.data?.updateCustomFood.kcal).toBe(300);
  });

  it('removes it from the pantry', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    const food = await create(session);

    await api.graphql(DELETE, { id: food.id }, session);

    const response = await api.graphql<{ myCustomFoods: Food[] }>(MINE, undefined, session);
    expect(response.data?.myCustomFoods).toHaveLength(0);
  });
});

describe('whose pantry it is', () => {
  it('shows nobody else’s foods', async () => {
    const owner = await api.signUp(OWNER, PASSWORD);
    await create(owner);
    const other = await api.signUp(SOMEBODY_ELSE, PASSWORD);

    const response = await api.graphql<{ myCustomFoods: Food[] }>(MINE, undefined, other);

    expect(response.data?.myCustomFoods).toHaveLength(0);
  });

  it('refuses to edit somebody else’s food, without saying it exists', async () => {
    const owner = await api.signUp(OWNER, PASSWORD);
    const food = await create(owner);
    const other = await api.signUp(SOMEBODY_ELSE, PASSWORD);

    const response = await api.graphql(
      UPDATE,
      { input: { id: food.id, name: 'Volé', ...DRAFT } },
      other,
    );

    expect(response.errors?.[0]?.message).toBe('No such food.');
  });

  it('refuses to remove somebody else’s food', async () => {
    const owner = await api.signUp(OWNER, PASSWORD);
    const food = await create(owner);
    const other = await api.signUp(SOMEBODY_ELSE, PASSWORD);

    await api.graphql(DELETE, { id: food.id }, other);

    const still = await api.graphql<{ myCustomFoods: Food[] }>(MINE, undefined, owner);
    expect(still.data?.myCustomFoods).toHaveLength(1);
  });
});
