import { api } from '../browser';

// Runs inside the menu site's page. When the site hands over pairing details —
// the reader having clicked "pair this browser" there — it saves them, so
// nothing is ever typed into the popup. The token never leaves the page that
// issued it: the message is same-origin, seen only by this page's own scripts.
type PairMessage = { type: 'menu:pair'; endpoint: string; token: string };

const isPair = (data: unknown): data is PairMessage => {
  if (typeof data !== 'object' || data === null) return false;
  const message = data as Partial<PairMessage>;

  return (
    message.type === 'menu:pair' &&
    typeof message.endpoint === 'string' &&
    typeof message.token === 'string'
  );
};

window.addEventListener('message', (event: MessageEvent): void => {
  if (event.source !== window || !isPair(event.data)) return;

  void api.storage.local
    .set({ endpoint: event.data.endpoint, deviceToken: event.data.token })
    .then((): void => {
      window.postMessage({ type: 'menu:paired' }, window.location.origin);
    });
});

// Announce that a paired-capable browser is right here, so the page can offer the
// one-click pairing instead of the copy-paste fallback.
window.postMessage({ type: 'menu:extension-here' }, window.location.origin);
