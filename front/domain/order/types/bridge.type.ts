// The same-origin messages the menu page and the paired-browser extension use
// to find each other and pair in one click. Defined once and shared: the page
// (useExtensionBridge) and the extension's content script speak from this
// contract instead of each restating the string literals and shapes.

// Page → extension.
export type WhereIsExtensionMessage = { type: 'menu:where-is-extension' };
export type PairMessage = { type: 'menu:pair'; endpoint: string; token: string };
export type AwaitCarrefourMessage = { type: 'menu:await-carrefour'; returnUrl: string };
export type PageMessage = WhereIsExtensionMessage | PairMessage | AwaitCarrefourMessage;

// Extension → page.
export type ExtensionHereMessage = { type: 'menu:extension-here'; configured: boolean };
export type PairedMessage = { type: 'menu:paired' };
export type ExtensionMessage = ExtensionHereMessage | PairedMessage;
