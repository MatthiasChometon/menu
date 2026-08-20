/** Everything the browser can say about itself, so nobody has to describe it.
 *  Gathered rather than asked: a person who has just hit a bug should not also
 *  have to work out their screen size. */
export type ReportContext = {
  /** The page they were on. The single most useful line for finding it again. */
  page: string;
  userAgent: string;
  /** Width by height in CSS pixels — how a layout bug is reproduced. */
  viewport: string;
  locale: string;
};

export type BugReportRecord = {
  id: string;
  userId: string | null;
  severity: string;
  message: string;
  context: ReportContext;
  status: string;
  createdAt: Date;
};
