import seasoningData from '~~/domain/menu/content/seasonings.json';
import { buildSeasoningCatalog, freshSeasonings } from '../utils/catalog';
import type { Recipe, Seasoning } from '../types/menu.type';

const catalog = buildSeasoningCatalog(seasoningData);

export const useSeasonings = (): {
  seasoningOf: (id: string) => Seasoning | undefined;
  seasoningsOf: (recipe: Recipe) => Seasoning[];
  freshOf: (recipes: Recipe[]) => Seasoning[];
} => ({
  seasoningOf: (id: string): Seasoning | undefined => catalog[id],
  seasoningsOf: (recipe: Recipe): Seasoning[] =>
    recipe.seasonings
      .map((id): Seasoning | undefined => catalog[id])
      .filter((seasoning): seasoning is Seasoning => seasoning !== undefined),
  freshOf: (recipes: Recipe[]): Seasoning[] => freshSeasonings(recipes, catalog),
});
