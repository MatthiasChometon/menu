import { fileURLToPath } from 'node:url';

const ICON_RUNTIME = '@nuxt/icon/dist/runtime/components/shared.js';
const GENERATED_BUNDLE = '"#build/nuxt-icon-client-bundle"';

// @nuxt/icon imports its generated icon bundle (about 11 KB gzipped of the first
// download) by an alias the bundler resolves before any plugin sees it. The browser
// build is given another import instead, `lazyIconBundle.ts`, which loads the bundle
// on demand; the server build keeps the original.
export const lazyIconBundlePlugin = (): {
  name: string;
  enforce: 'pre';
  transform: (code: string, id: string) => string | undefined;
} => {
  const lazyIconBundle = JSON.stringify(
    fileURLToPath(new URL('./lazyIconBundle.ts', import.meta.url)),
  );
  return {
    name: 'lazy-icon-bundle',
    enforce: 'pre',
    transform: (code, id) =>
      id.replaceAll('\\', '/').endsWith(ICON_RUNTIME)
        ? code.replace(GENERATED_BUNDLE, lazyIconBundle)
        : undefined,
  };
};
