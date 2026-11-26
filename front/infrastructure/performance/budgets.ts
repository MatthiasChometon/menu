// The time budgets of the screens. Each comes from a UX rule, never from what the code
// does today (docs/plans/refactor-socle.md, "Performance lot"): a screen slower than its
// budget is a bug to fix, and loosening a number needs the maintainer's agreement.
export const BUDGETS = {
  /** Flow of thought kept (Nielsen 1 s, RAIL "load"): main content after a client-side navigation. */
  warmMainContentMs: 1000,
  /** Largest Contentful Paint, "good" (Core Web Vitals), on a cold load. */
  coldLcpMs: 2500,
  /** Interaction to Next Paint, "good" (Core Web Vitals). */
  interactionMs: 200,
  /** Feels instantaneous (Nielsen 0.1 s, RAIL "response"): a tap shows something. */
  feedbackMs: 100,
  /** Cumulative Layout Shift, "good" (Core Web Vitals). */
  layoutShift: 0.1,
} as const;

/** The CPU slowdown that stands for a mid-tier mobile, the Lighthouse reference. */
export const CPU_SLOWDOWN = 4;

/** Samples per measurement: a median over fewer than ten is a guess. */
export const PASSES = 10;
