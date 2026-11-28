import { initServerIconBundle } from './serverIconBundle';

type AddIcon = (name: string, data: unknown) => unknown;

// Stands in for `#build/nuxt-icon-client-bundle` (see lazyIconBundleModule). The
// bundle is 172 icons, about 11 KB gzipped of the 168 KB the first paint downloads,
// yet a prerendered page already carries in its payload every icon it draws on the
// server: the bundle is only the fallback for an icon first drawn in the browser
// (a dialog, a state change). The server keeps it synchronous, since it writes the
// icons into the page; the browser fetches its chunk when one is asked for.
let loading: Promise<void> | undefined;

const loadBundle = (addIcon: AddIcon): Promise<void> => {
  loading ??= import('#build/nuxt-icon-client-bundle.mjs').then((bundle): void => {
    bundle.init(addIcon);
  });
  return loading;
};

export const init = (addIcon: AddIcon): void => {
  if (import.meta.server) initServerIconBundle(addIcon);
  else {
    loadBundle(addIcon).catch((): void => {
      // Offline or a stale chunk: ask again at the next icon rather than stay without.
      loading = undefined;
    });
  }
};
