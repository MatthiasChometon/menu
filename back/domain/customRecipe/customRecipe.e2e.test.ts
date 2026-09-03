import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from '../../infrastructure/testing/e2e-app';
import { customRecipeConstraints } from './utils';

const OWNER = 'matthias@example.com';
const SOMEBODY_ELSE = 'someone-else@example.com';
const PASSWORD = 'a-long-enough-password';

const RECIPE_FIELDS = `id name slot ingredients { foodId grams } steps prepMinutes batch`;

const MINE = `query { myCustomRecipes { ${RECIPE_FIELDS} } }`;

const CREATE = `
  mutation ($input: CustomRecipeInput!) {
    createCustomRecipe(input: $input) { ${RECIPE_FIELDS} }
  }
`;

const UPDATE = `
  mutation ($input: UpdateCustomRecipeInput!) {
    updateCustomRecipe(input: $input) { ${RECIPE_FIELDS} }
  }
`;

const DELETE = `mutation ($id: ID!) { deleteCustomRecipe(id: $id) }`;

const CREATE_FOOD = `
  mutation ($input: CustomFoodInput!) {
    createCustomFood(input: $input) { id }
  }
`;

type Recipe = {
  id: string;
  name: string;
  slot: string;
  ingredients: { foodId: string; grams: number }[];
  steps: string[];
  prepMinutes: number;
  batch: boolean;
};

const DRAFT = {
  slot: 'MAIN',
  ingredients: [{ foodId: 'chickenBreast', grams: 150 }],
  steps: ['Faire cuire le poulet.'],
  prepMinutes: 20,
  batch: false,
};

let api: TestApp;

const create = async (
  session: string,
  name = 'Poulet de mémé',
  draft: Omit<Recipe, 'id' | 'name'> = DRAFT,
): Promise<Recipe> => {
  const response = await api.graphql<{ createCustomRecipe: Recipe }>(
    CREATE,
    { input: { name, ...draft } },
    session,
  );

  if (response.data === undefined) throw new Error(response.errors?.[0]?.message);

  return response.data.createCustomRecipe;
};

const createCustomFoodId = async (session: string): Promise<string> => {
  const response = await api.graphql<{ createCustomFood: { id: string } }>(
    CREATE_FOOD,
    {
      input: {
        name: 'Tofu maison',
        kcal: 150,
        protein: 15,
        fat: 8,
        carbs: 2,
        fiber: 1,
        pricePerKg: 10,
      },
    },
    session,
  );

  if (response.data === undefined) throw new Error(response.errors?.[0]?.message);

  return response.data.createCustomFood.id;
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

describe('writing a recipe of one’s own', () => {
  it('is refused to whoever is not signed in', async () => {
    const response = await api.graphql(MINE);

    expect(response.errors?.[0]?.message).toBe('Unauthorized');
  });

  it('cannot be created without a session', async () => {
    const response = await api.graphql(CREATE, { input: { name: 'Poulet', ...DRAFT } });

    expect(response.errors?.[0]?.message).toBe('Unauthorized');
  });

  it('starts empty', async () => {
    const session = await api.signUp(OWNER, PASSWORD);

    const response = await api.graphql<{ myCustomRecipes: Recipe[] }>(MINE, undefined, session);

    expect(response.data?.myCustomRecipes).toEqual([]);
  });

  it('is created and comes back with its ingredients and steps', async () => {
    const session = await api.signUp(OWNER, PASSWORD);

    const recipe = await create(session);

    expect(recipe.name).toBe('Poulet de mémé');
    expect(recipe.slot).toBe('MAIN');
    expect(recipe.ingredients).toEqual([{ foodId: 'chickenBreast', grams: 150 }]);
    expect(recipe.steps).toEqual(['Faire cuire le poulet.']);
  });

  it('may point an ingredient at one of the cook’s own foods', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    const foodId = await createCustomFoodId(session);

    const recipe = await create(session, 'Bowl maison', {
      ...DRAFT,
      ingredients: [{ foodId, grams: 200 }],
    });

    expect(recipe.ingredients).toEqual([{ foodId, grams: 200 }]);
  });

  it('refuses an ingredient pointing at somebody else’s custom food', async () => {
    const owner = await api.signUp(OWNER, PASSWORD);
    const foodId = await createCustomFoodId(owner);
    const other = await api.signUp(SOMEBODY_ELSE, PASSWORD);

    const response = await api.graphql(
      CREATE,
      { input: { name: 'Volé', ...DRAFT, ingredients: [{ foodId, grams: 200 }] } },
      other,
    );

    expect(response.errors?.[0]?.message).toBe('No such food.');
  });

  it('refuses a recipe with no name at all', async () => {
    const session = await api.signUp(OWNER, PASSWORD);

    const response = await api.graphql(CREATE, { input: { name: '  ', ...DRAFT } }, session);

    expect(response.errors?.[0]?.message).toBeDefined();
  });

  it('refuses a recipe with no ingredient at all', async () => {
    const session = await api.signUp(OWNER, PASSWORD);

    const response = await api.graphql(
      CREATE,
      { input: { name: 'Vide', ...DRAFT, ingredients: [] } },
      session,
    );

    expect(response.errors?.[0]?.message).toBeDefined();
  });

  it('refuses a slot that is not one', async () => {
    const session = await api.signUp(OWNER, PASSWORD);

    const response = await api.graphql(
      CREATE,
      { input: { name: 'Mauvais slot', ...DRAFT, slot: 'DESSERT' } },
      session,
    );

    expect(response.errors?.[0]?.message).toBeDefined();
  });

  it('refuses an ingredient identifier that is anything but one', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    const injected = { foodId: "'; DROP TABLE custom_recipe; --", grams: 100 };

    const response = await api.graphql(
      CREATE,
      { input: { name: 'Injection', ...DRAFT, ingredients: [injected] } },
      session,
    );

    expect(response.errors?.[0]?.message).toBeDefined();
  });

  it('refuses more than a book ever holds at once', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    const { maxItems } = customRecipeConstraints();
    for (let filled = 0; filled < maxItems; filled += 1) await create(session, `Recette ${filled}`);

    const response = await api.graphql(CREATE, { input: { name: 'En trop', ...DRAFT } }, session);

    expect(response.errors?.[0]?.message).toContain(String(maxItems));
  });
});

describe('correcting and removing a custom recipe', () => {
  it('replaces it wholesale', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    const recipe = await create(session);

    const response = await api.graphql<{ updateCustomRecipe: Recipe }>(
      UPDATE,
      { input: { id: recipe.id, name: 'Poulet rôti', ...DRAFT, prepMinutes: 45 } },
      session,
    );

    expect(response.data?.updateCustomRecipe.name).toBe('Poulet rôti');
    expect(response.data?.updateCustomRecipe.prepMinutes).toBe(45);
  });

  it('removes it from the book', async () => {
    const session = await api.signUp(OWNER, PASSWORD);
    const recipe = await create(session);

    await api.graphql(DELETE, { id: recipe.id }, session);

    const response = await api.graphql<{ myCustomRecipes: Recipe[] }>(MINE, undefined, session);
    expect(response.data?.myCustomRecipes).toHaveLength(0);
  });
});

describe('whose book it is', () => {
  it('shows nobody else’s recipes', async () => {
    const owner = await api.signUp(OWNER, PASSWORD);
    await create(owner);
    const other = await api.signUp(SOMEBODY_ELSE, PASSWORD);

    const response = await api.graphql<{ myCustomRecipes: Recipe[] }>(MINE, undefined, other);

    expect(response.data?.myCustomRecipes).toHaveLength(0);
  });

  it('refuses to edit somebody else’s recipe, without saying it exists', async () => {
    const owner = await api.signUp(OWNER, PASSWORD);
    const recipe = await create(owner);
    const other = await api.signUp(SOMEBODY_ELSE, PASSWORD);

    const response = await api.graphql(
      UPDATE,
      { input: { id: recipe.id, name: 'Volé', ...DRAFT } },
      other,
    );

    expect(response.errors?.[0]?.message).toBe('No such recipe.');
  });

  it('refuses to remove somebody else’s recipe', async () => {
    const owner = await api.signUp(OWNER, PASSWORD);
    const recipe = await create(owner);
    const other = await api.signUp(SOMEBODY_ELSE, PASSWORD);

    await api.graphql(DELETE, { id: recipe.id }, other);

    const still = await api.graphql<{ myCustomRecipes: Recipe[] }>(MINE, undefined, owner);
    expect(still.data?.myCustomRecipes).toHaveLength(1);
  });
});
