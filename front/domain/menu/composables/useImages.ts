// The manifest file may carry more than the photograph maps (a version, say):
// only the maps below are read, so anything else is dropped on the way in.
const imageKinds = ['recipe', 'food', 'equipment'] as const;
type ImageKind = (typeof imageKinds)[number];
type Manifest = Partial<Record<ImageKind, Record<string, string>>>;

const isFileMap = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).every((file): boolean => typeof file === 'string');

// The host's answer is untrusted until it has been through here: only the maps
// of filenames survive, and a body that is not an object is refused outright,
// so the baked-in copy keeps serving.
const manifestFrom = (raw: unknown): Manifest | undefined => {
  if (typeof raw !== 'object' || raw === null) return undefined;

  const entries = Object.entries(raw).filter(
    (entry): entry is [ImageKind, Record<string, string>] =>
      imageKinds.some((kind): boolean => kind === entry[0]) && isFileMap(entry[1]),
  );

  return Object.fromEntries(entries);
};

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
  useState<Manifest>('images:manifest', (): Manifest => useRuntimeConfig().public.imageManifest);

const host = (): string => String(useRuntimeConfig().public.imagesBase).replace(/\/+$/, '');

export const useImages = (): {
  recipeImage: (id: string) => string | undefined;
  foodImage: (id: string) => string | undefined;
  equipmentImage: (id: string) => string | undefined;
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
    equipmentImage: (id: string): string | undefined => urlOf('equipment', id),
    // Every photograph the manifest knows about. Only the background warm-up
    // needs this: pages ask for one picture at a time, by identifier.
    everyImage: (): string[] => {
      const manifest = state().value;
      const base = host();

      return imageKinds.flatMap((kind): string[] =>
        Object.values(manifest[kind] ?? {}).map((file): string => `${base}/${kind}/${file}`),
      );
    },
    refresh: async (): Promise<void> => {
      // A static file on the image host, not the API: useApi (and its auth and
      // error plumbing) has nothing to add here, and a failure just keeps the
      // baked-in manifest.
      const raw: unknown = await $fetch(`${host()}/manifest.json`).catch(
        (): undefined => undefined,
      );
      const fresh = manifestFrom(raw);
      if (fresh !== undefined) state().value = fresh;
    },
  };
};
