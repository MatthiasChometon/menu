// The manifest, built per browser. The two stores disagree on one field —
// how the background runs — and Firefox needs an explicit add-on id. Everything
// else is shared, so it lives here once and the build writes the right one.
export type Target = 'chrome' | 'firefox';

const base = {
  manifest_version: 3 as const,
  name: 'Menu — courses Carrefour',
  description:
    'Remplit le panier Carrefour à partir du menu de la semaine. Ne valide ni ne paie jamais une commande.',
  version: '0.1.0',
  icons: { '16': 'icon.png', '48': 'icon.png', '128': 'icon.png' },
  permissions: ['storage', 'tabs', 'notifications', 'alarms'],
  host_permissions: ['https://www.carrefour.fr/*'],
  action: {
    default_popup: 'popup/index.html',
    default_title: 'Menu — courses',
    default_icon: 'icon.png',
  },
  content_scripts: [
    {
      matches: ['https://www.carrefour.fr/*'],
      js: ['carrefour/content.js'],
      run_at: 'document_idle',
    },
    {
      // The bridge that lets the menu site pair this browser in one click,
      // instead of the reader copying a token into the popup.
      matches: ['https://menu.mtxlab.xyz/*'],
      js: ['menu/bridge.js'],
      run_at: 'document_idle',
    },
  ],
};

export const buildManifest = (target: Target): Record<string, unknown> => {
  if (target === 'firefox') {
    return {
      ...base,
      // Firefox has no service-worker background in MV3: an event page runs the
      // same bundle. Gecko also needs an explicit id to install and to update.
      background: { scripts: ['background/worker.js'], type: 'module' },
      browser_specific_settings: {
        gecko: { id: 'menu-courses@mtxlab.xyz', strict_min_version: '121.0' },
      },
    };
  }

  return { ...base, background: { service_worker: 'background/worker.js', type: 'module' } };
};
