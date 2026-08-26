/** What the browser can say about itself when an idea is sent, so nobody has to
 *  describe where they were. Identical in shape to a bug's context — the same
 *  four things are worth knowing wherever the feedback comes from — but kept
 *  local so this slice stands on its own. */
export type SuggestionContext = {
  /** The page they were on when the idea struck. */
  page: string;
  userAgent: string;
  /** Width by height in CSS pixels. */
  viewport: string;
  locale: string;
};

export type ImprovementRequestRecord = {
  id: string;
  userId: string | null;
  importance: string;
  message: string;
  context: SuggestionContext;
  status: string;
  createdAt: Date;
};
