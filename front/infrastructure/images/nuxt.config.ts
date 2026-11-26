// The photographs live on o2switch, not in the bundle. Two things follow, and
// they pull against each other:
//
//   - the site is prerendered, so it has to know the filenames at build time or
//     every card paints a pictogram first and swaps to a photo a moment later;
//   - a photo added later must appear WITHOUT rebuilding, which is the whole
//     reason they left the repository.
//
// So the manifest is read twice: baked in here for the first paint, and
// refreshed in the browser for anything added since. A build with no network
// falls back to an empty manifest and the runtime read carries it.
const base = process.env.NUXT_PUBLIC_IMAGES_BASE ?? 'https://images.menu.mtxlab.xyz';

type ImageManifest = Record<string, Record<string, string>>;

const isFileMap = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).every((file): boolean => typeof file === 'string');

// The file also carries a version number beside the maps of filenames: only the
// maps are kept, instead of refusing the whole file (which baked in an empty
// manifest and shipped every page with a pictogram and no preload).
const imageManifestFrom = (value: unknown): ImageManifest => {
  if (typeof value !== 'object' || value === null) return {};

  return Object.fromEntries(Object.entries(value).filter(([, files]) => isFileMap(files)));
};

const manifestAtBuild = async (): Promise<ImageManifest> => {
  try {
    const response = await fetch(`${base}/manifest.json`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return {};
    const manifest: unknown = await response.json();
    return imageManifestFrom(manifest);
  } catch {
    // Offline, or the host is down: the pages still build, and the browser
    // fetches the manifest itself. Failing the build over a picture would be
    // the wrong trade.
    return {};
  }
};

const manifest = await manifestAtBuild();

export default defineNuxtConfig({
  // The photographs come from another origin: connecting early saves the DNS, TCP and TLS
  // round trips that otherwise sit in front of the first one.
  app: { head: { link: [{ rel: 'preconnect', href: base }] } },
  runtimeConfig: {
    public: {
      imagesBase: base,
      imageManifest: manifest,
    },
  },
});
