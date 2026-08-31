import { browser } from '#imports';
import {
  isAwaitCarrefour,
  isPair,
  isWhereIsExtension,
} from '../../../front/domain/order/utils/bridge';
import type {
  ExtensionHereMessage,
  PairedMessage,
} from '../../../front/domain/order/types/bridge.type';

// Runs inside the menu site's page. When the site hands over pairing details —
// the reader having clicked "pair this browser" there — it saves them, so nothing
// is ever typed into the popup. The token never leaves the page that issued it:
// the message is same-origin, seen only by this page's own scripts.
export const startPairingBridge = (): void => {
  // Announce presence, and whether a pairing is already stored: the page pairs
  // this browser silently on first install and never does it a second time.
  const announce = (): void => {
    void browser.storage.local
      .get('deviceToken')
      .then((stored: { deviceToken?: unknown }): void => {
        const here: ExtensionHereMessage = {
          type: 'menu:extension-here',
          configured: typeof stored.deviceToken === 'string',
        };
        window.postMessage(here, window.location.origin);
      });
  };

  window.addEventListener('message', (event: MessageEvent): void => {
    if (event.source !== window) return;

    // The page asks whether an extension is here — answered so detection never
    // depends on which loaded first, the content script or the page's listener.
    if (isWhereIsExtension(event.data)) {
      announce();
      return;
    }

    // The page is sending the reader to Carrefour and wants them back here once
    // signed in — remembered so the Carrefour content script can carry them over.
    if (isAwaitCarrefour(event.data)) {
      void browser.storage.local.set({ returnUrl: event.data.returnUrl });
      return;
    }

    if (!isPair(event.data)) return;

    void browser.storage.local
      .set({ endpoint: event.data.endpoint, deviceToken: event.data.token })
      .then((): void => {
        const paired: PairedMessage = { type: 'menu:paired' };
        window.postMessage(paired, window.location.origin);
        // Re-announce as configured, so the page settles on "done" with no reload.
        announce();
      });
  });

  // Also announce on load, for a page that is already listening.
  announce();
};
