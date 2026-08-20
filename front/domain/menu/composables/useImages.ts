// Images live in assets/ so Vite hashes them and, more importantly, so this
// glob knows which ones actually exist: a missing photo falls back to a pictogram
// instead of firing a 404 and flashing broken alt text.
const recipeImages = import.meta.glob<string>('../../../assets/images/recipe/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
});

const foodImages = import.meta.glob<string>('../../../assets/images/food/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
});

const indexByName = (modules: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(modules).map(([path, url]): [string, string] => [
      path.split('/').pop()?.replace('.webp', '') ?? path,
      url,
    ]),
  );

const recipeIndex = indexByName(recipeImages);
const foodIndex = indexByName(foodImages);

export const useImages = (): {
  recipeImage: (id: string) => string | undefined;
  foodImage: (id: string) => string | undefined;
  everyImage: () => string[];
} => ({
  recipeImage: (id: string): string | undefined => recipeIndex[id],
  foodImage: (id: string): string | undefined => foodIndex[id],
  // Every photograph the build knows about. Only the background warm-up needs
  // this: the pages ask for one picture at a time, by identifier.
  everyImage: (): string[] => [...Object.values(recipeIndex), ...Object.values(foodIndex)],
});
