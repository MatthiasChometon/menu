// The manifest is not a map of maps: it carries a version beside the two
// collections, and an index signature saying "every key is a map of strings"
// made that version a type error at build. Named for what the file actually
// contains instead.
type ImageKind = 'recipe' | 'food';
type Manifest = { version?: number } & Partial<Record<ImageKind, Record<string, string>>>;

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
    // Through unknown: the file also carries a version number, which this type
    // deliberately ignores because nothing here reads it. Without the step the
    // production build refuses the cast outright.
    (): Manifest => (useRuntimeConfig().public.imageManifest ?? {}) as unknown as Manifest,
  );

const host = (): string => String(useRuntimeConfig().public.imagesBase).replace(/\/+$/, '');

export const useImages = (): {
  recipeImage: (id: string) => string | undefined;
  foodImage: (id: string) => string | undefined;
  everyImage: () => string[];
  refresh: () => Promise<void>;
} => {
  const urlOf = (kind: ImageKind, id: string): string | undefined => {
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

      return (['recipe', 'food'] as const).flatMap((kind): string[] =>
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
