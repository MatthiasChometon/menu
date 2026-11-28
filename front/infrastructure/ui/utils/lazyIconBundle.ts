type AddIcon = (name: string, data: unknown) => unknown;
type IconSet = { prefix: string; icons: Record<string, unknown> };
type SetCustomIconsLoader = (
  loader: (names: string[], prefix: string) => Promise<IconSet>,
  prefix: string,
) => void;

// Stands in, in the browser build only, for `#build/nuxt-icon-client-bundle` (see
// lazyIconBundlePlugin). The bundle is 172 icons, about 11 KB gzipped of the first
// download, yet a prerendered page already carries in its payload every icon it drew on
// the server: the bundle only serves an icon first drawn in the browser (a dialog, a
// food icon once the week is loaded). Those icons are asked of Iconify by prefix, and a
// loader registered for each prefix answers from the bundle, fetched at that moment;
// without it Iconify would ask its public API, which the site's own
// Content-Security-Policy forbids.
const PREFIXES = ['lucide', 'simple-icons'];

const collected = new Map<string, unknown>();
let loading: Promise<void> | undefined;
let registered = false;

const loadBundle = (addIcon: AddIcon): Promise<void> => {
  loading ??= import('#build/nuxt-icon-client-bundle.mjs')
    .then((bundle): void => {
      bundle.init((name: string, data: unknown): void => {
        collected.set(name, data);
        addIcon(name, data);
      });
    })
    .catch((error: unknown): never => {
      // Offline or a stale chunk: ask again at the next icon rather than stay without.
      loading = undefined;
      throw error;
    });
  return loading;
};

export const init = (addIcon: AddIcon, setCustomIconsLoader: SetCustomIconsLoader): void => {
  if (registered) return;
  registered = true;
  for (const prefix of PREFIXES) {
    setCustomIconsLoader(async (names, iconPrefix): Promise<IconSet> => {
      await loadBundle(addIcon);
      const icons: Record<string, unknown> = {};
      for (const name of names) {
        const data = collected.get(`${iconPrefix}:${name}`);
        if (data !== undefined) icons[name] = data;
      }
      return { prefix: iconPrefix, icons };
    }, prefix);
  }
};
