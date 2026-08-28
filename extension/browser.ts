// One extension API for both browsers. Chrome exposes only `chrome.*`, which is
// promise-based since Manifest V3. Firefox exposes `browser.*` (promise-based)
// and a `chrome.*` that is callback-only — so `await chrome.tabs.query(...)`
// resolves to nothing there. Preferring `browser` when it exists gives a single
// promise-returning namespace that awaits correctly on both, while the `chrome`
// types keep describing it.
export const api: typeof chrome =
  (globalThis as unknown as { browser?: typeof chrome }).browser ?? chrome;
