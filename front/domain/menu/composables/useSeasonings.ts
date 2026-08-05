import seasoningData from '~~/content/seasonings.json';

type RawSeasoning = {
  name: LocalizedText;
  icon: string;
  fresh?: boolean;
  amount?: LocalizedText;
};

const rawSeasonings: Record<string, RawSeasoning> = seasoningData;

const catalog: Record<string, Seasoning> = Object.fromEntries(
  Object.entries(rawSeasonings).map(([id, raw]): [string, Seasoning] => [
    id,
    { id, name: raw.name, icon: raw.icon, fresh: raw.fresh === true, amount: raw.amount },
  ]),
);

const resolve = (ids: string[]): Seasoning[] =>
  ids
    .map((id): Seasoning | undefined => catalog[id])
    .filter((seasoning): seasoning is Seasoning => seasoning !== undefined);

export const useSeasonings = (): {
  seasoningOf: (id: string) => Seasoning | undefined;
  seasoningsOf: (recipe: Recipe) => Seasoning[];
  freshOf: (recipes: Recipe[]) => Seasoning[];
} => ({
  seasoningOf: (id: string): Seasoning | undefined => catalog[id],
  seasoningsOf: (recipe: Recipe): Seasoning[] => resolve(recipe.seasonings),
  // What has to be bought for the week: the same head of garlic serves every
  // recipe that calls for it, so each one appears once.
  freshOf: (recipes: Recipe[]): Seasoning[] =>
    resolve([...new Set(recipes.flatMap((recipe): string[] => recipe.seasonings))]).filter(
      (seasoning): boolean => seasoning.fresh,
    ),
});
