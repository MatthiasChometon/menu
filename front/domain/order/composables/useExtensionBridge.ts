// Talks to the paired-browser extension through the page: its content script
// posts a message to say it is here, and listens for the pairing details this
// hands back. When the extension is installed, pairing is one click and nothing
// is typed into its popup; when it is not, the page falls back to showing the
// token to copy.
export const useExtensionBridge = (): {
  /** The extension's content script announced itself on this page. */
  extensionHere: Ref<boolean>;
  /** The extension already holds a pairing: nothing to configure. */
  extensionConfigured: Ref<boolean>;
  /** The extension confirmed it stored the pairing this handed it. */
  justPaired: Ref<boolean>;
  /** Hand the extension the API address and a fresh token, same-origin only. */
  sendPairing: (endpoint: string, token: string) => void;
  /** Ask the extension to bring this browser back here once signed in to the shop. */
  armCarrefourReturn: (returnUrl: string) => void;
} => {
  const extensionHere = ref(false);
  const extensionConfigured = ref(false);
  const justPaired = ref(false);

  const onMessage = (event: MessageEvent): void => {
    if (event.source !== window) return;

    const data = event.data as { type?: unknown; configured?: unknown } | null;
    if (data?.type === 'menu:extension-here') {
      extensionHere.value = true;
      extensionConfigured.value = data.configured === true;
    }
    if (data?.type === 'menu:paired') {
      justPaired.value = true;
      extensionConfigured.value = true;
    }
  };

  onMounted((): void => {
    window.addEventListener('message', onMessage);
    // Ask, rather than only wait: the extension may have announced itself before
    // this page was listening, so a question guarantees an answer if it is here.
    window.postMessage({ type: 'menu:where-is-extension' }, window.location.origin);
  });
  onScopeDispose((): void => window.removeEventListener('message', onMessage));

  return {
    extensionHere,
    extensionConfigured,
    justPaired,
    sendPairing: (endpoint: string, token: string): void => {
      window.postMessage({ type: 'menu:pair', endpoint, token }, window.location.origin);
    },
    armCarrefourReturn: (returnUrl: string): void => {
      window.postMessage({ type: 'menu:await-carrefour', returnUrl }, window.location.origin);
    },
  };
};
