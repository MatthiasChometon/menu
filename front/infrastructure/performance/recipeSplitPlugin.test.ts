import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { recipeSplitPlugin } from './recipeSplitPlugin';

const RECIPES = {
  soup: {
    slot: 'main',
    name: { fr: 'Soupe', en: 'Soup' },
    ingredients: { leek: 100 },
    steps: { fr: ['Cuire {le poireau|leek} doucement'], en: ['Simmer {the leek|leek}'] },
  },
  salad: {
    slot: 'main',
    name: { fr: 'Salade', en: 'Salad' },
    ingredients: { lettuce: 80 },
    steps: { fr: ['Laver {la laitue|lettuce}'], en: ['Wash {the lettuce|lettuce}'] },
  },
};

const pluginOver = (): ReturnType<typeof recipeSplitPlugin> => {
  const dir = mkdtempSync(join(tmpdir(), 'recipes-'));
  const file = join(dir, 'recipes.json');
  writeFileSync(file, JSON.stringify(RECIPES));
  return recipeSplitPlugin(file);
};

const loaded = (id: string): string => {
  const plugin = pluginOver();
  const resolved = plugin.resolveId(id);
  if (resolved === undefined) throw new Error(`${id} is not resolved`);
  return plugin.load(resolved) ?? '';
};

describe('recipeSplitPlugin', () => {
  it('leaves ids it does not own to the other plugins', () => {
    expect(pluginOver().resolveId('vue')).toBeUndefined();
  });

  it("gives a recipe's chunk its own steps and none of the other recipes", () => {
    const soup = loaded('virtual:recipe-steps/soup');

    expect(soup).toContain('Cuire');
    expect(soup).not.toContain('Laver');
    expect(soup).not.toContain('lettuce');
    expect(soup).not.toContain('Salade');
  });

  it('keeps the steps out of the catalogue the other pages read', () => {
    const catalogue = loaded('virtual:recipe-catalog');

    expect(catalogue).toContain('Soupe');
    expect(catalogue).toContain('Salade');
    expect(catalogue).not.toContain('Cuire');
    expect(catalogue).not.toContain('Laver');
  });

  it('points every recipe at a chunk of its own', () => {
    const index = loaded('virtual:recipe-steps');

    expect(index).toContain('import("virtual:recipe-steps/soup")');
    expect(index).toContain('import("virtual:recipe-steps/salad")');
    expect(index).not.toContain('Cuire');
  });
});
