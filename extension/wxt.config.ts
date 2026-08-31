import { defineConfig } from 'wxt';

// WXT builds the extension: it derives the manifest from the entrypoints, bundles
// each content script standalone (no shared chunk), provides a unified `browser`
// namespace for both stores, and builds Chrome and Firefox from the same code.
//
// Auto-imports are off on purpose: every WXT API is imported explicitly from
// '#imports', the way the rest of the codebase imports its own modules.
export default defineConfig({
  imports: false,
  manifest: {
    name: 'Menu — courses Carrefour',
    description:
      'Remplit le panier Carrefour à partir du menu de la semaine. Ne valide ni ne paie jamais une commande.',
    permissions: ['storage', 'tabs', 'notifications', 'alarms'],
    host_permissions: ['https://www.carrefour.fr/*'],
    browser_specific_settings: {
      gecko: { id: 'menu-courses@mtxlab.xyz', strict_min_version: '121.0' },
    },
  },
});
