// The stylesheet blocks the first paint and is matched against every element: 232 KB were
// measured before the rules naming a class nobody ships were dropped (143 KB after).
// The ceiling leaves room to grow a little, not to drift back.
export const STYLESHEET_BUDGET_BYTES = 150_000;

export const stylesheetProblemsOf = (bytes: number): string[] =>
  bytes > STYLESHEET_BUDGET_BYTES
    ? [`the stylesheet weighs ${bytes} B, over ${STYLESHEET_BUDGET_BYTES} B`]
    : [];
