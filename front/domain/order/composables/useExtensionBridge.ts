// Talks to the paired-browser extension through the page: its content script
// posts a message to say it is here, and listens for the pairing details this
// hands back. When the extension is installed, pairing is one click and nothing
// is typed into its popup; when it is not, the page falls back to showing the
// token to copy.
export const useExtensionBridge = (): {
  /** The extension's content script announced itself on this page. */
  extensionHere: Ref<boolean>;
  /** The extension confirmed it stored the pairing this handed it. */
  justPaired: Ref<boolean>;
  /** Hand the extension the API address and a fresh token, same-origin only. */
  sendPairing: (endpoint: string, token: string) => void;
} => {
  const extensionHere = ref(false);
  const justPaired = ref(false);

  const onMessage = (event: MessageEvent): void => {
    if (event.source !== window) return;

    const type = (event.data as { type?: unknown } | null)?.type;
    if (type === 'menu:extension-here') extensionHere.value = true;
    if (type === 'menu:paired') justPaired.value = true;
  };

  onMounted((): void => window.addEventListener('message', onMessage));
  onScopeDispose((): void => window.removeEventListener('message', onMessage));

  return {
    extensionHere,
    justPaired,
    sendPairing: (endpoint: string, token: string): void => {
      window.postMessage({ type: 'menu:pair', endpoint, token }, window.location.origin);
    },
  };
};
