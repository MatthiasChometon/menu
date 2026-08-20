type Kind = 'recipe' | 'food';

// The shape the host actually serves, version field and all. Typed exactly
// rather than as a bag of records: the version is a number, and pretending
// otherwise is what the build refused.
type Manifest = { version?: number } & Partial<Record<Kind, Record<string, string>>>;

const KINDS: readonly Kind[] = ['recipe', 'food'];

// Which photograph belongs to which dish, and under which filename. It used to
// be a build-time glob over assets/; the files now live on their own host, so
// the answer comes from a manifest served beside them.
//
// Seeded from the copy baked in at build so the first paint already has its
// pictures, then refreshed from the host so a photo added since shows up
// without anybody rebuilding the site.
//
// Nothing here touches the Nuxt context until a function is CALLED. useImages()
// itself must stay inert: useRecipes() invokes it while its module is being
// evaluated, long before any component exists, and reading the config there
// fails the whole prerender.
const state = (): Ref<Manifest> =>
  useState<Manifest>(
    'images:manifest',
    (): Manifest => (useRuntimeConfig().public.imageManifest ?? {}) as Manifest,
  );

const host = (): string => String(useRuntimeConfig().public.imagesBase).replace(/\/+$/, '');

export const useImages = (): {
  recipeImage: (id: string) => string | undefined;
  foodImage: (id: string) => string | undefined;
  everyImage: () => string[];
  refresh: () => Promise<void>;
} => {
  const urlOf = (kind: Kind, id: string): string | undefined => {
    const file = state().value[kind]?.[id];

    // Absent from the manifest means no photograph exists — the caller shows a
    // pictogram. Building a URL anyway would trade a clean fallback for a 404
    // and a flash of broken image.
    return file === undefined ? undefined : `${host()}/${kind}/${file}`;
  };

  return {
    recipeImage: (id: string): string | undefined => urlOf('recipe', id),
    foodImage: (id: string): string | undefined => urlOf('food', id),
    // Every photograph the manifest knows about. Only the background warm-up
    // needs this: pages ask for one picture at a time, by identifier.
    everyImage: (): string[] => {
      const manifest = state().value;
      const base = host();

      return KINDS.flatMap((kind): string[] =>
        Object.values(manifest[kind] ?? {}).map((file): string => `${base}/${kind}/${file}`),
      );
    },
    refresh: async (): Promise<void> => {
      const fresh = await $fetch<Manifest>(`${host()}/manifest.json`).catch(
        (): undefined => undefined,
      );
      if (fresh !== undefined) state().value = fresh;
    },
  };
};
