// The extension namespace, inlined rather than imported from ../browser: a
// content script cannot pull in a shared chunk — Chrome will not inject an
// ES-module content script — so its one dependency has to live in the file.
// See ../browser for why `browser` is preferred over `chrome`.
const api: typeof chrome =
  (globalThis as unknown as { browser?: typeof chrome }).browser ?? chrome;

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

const announce = (): void => {
  window.postMessage({ type: 'menu:extension-here' }, window.location.origin);
};

window.addEventListener('message', (event: MessageEvent): void => {
  if (event.source !== window) return;

  // The page asks whether an extension is here — answered so detection never
  // depends on which loaded first, the content script or the page's listener.
  if ((event.data as { type?: unknown } | null)?.type === 'menu:where-is-extension') {
    announce();
    return;
  }

  if (!isPair(event.data)) return;

  void api.storage.local
    .set({ endpoint: event.data.endpoint, deviceToken: event.data.token })
    .then((): void => {
      window.postMessage({ type: 'menu:paired' }, window.location.origin);
    });
});

// Also announce on load, for a page that is already listening.
announce();
