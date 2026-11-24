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

const isImageManifest = (value: unknown): value is ImageManifest =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).every(
    (files): boolean =>
      typeof files === 'object' &&
      files !== null &&
      Object.values(files).every((file): boolean => typeof file === 'string'),
  );

const manifestAtBuild = async (): Promise<ImageManifest> => {
  try {
    const response = await fetch(`${base}/manifest.json`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return {};
    const manifest: unknown = await response.json();
    return isImageManifest(manifest) ? manifest : {};
  } catch {
    // Offline, or the host is down: the pages still build, and the browser
    // fetches the manifest itself. Failing the build over a picture would be
    // the wrong trade.
    return {};
  }
};

const manifest = await manifestAtBuild();

export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      imagesBase: base,
      imageManifest: manifest,
    },
  },
});
