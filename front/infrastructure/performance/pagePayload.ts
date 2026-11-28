// What a prerendered page ships beside its HTML: `<page>/_payload.json`, fetched before the app
// hydrates. It must hold what the first render needs and nothing the browser can build itself
// (the example week was once in it, 20 KB gzipped on /recettes, while the catalogues it is built
// from are loaded anyway). Measured: 1.0 to 1.6 KB gzipped on the pages Lighthouse visits.
export const PAGE_PAYLOAD_BUDGET_GZIP_BYTES = 5_000;

export const pagePayloadProblemsOf = (page: string, gzipBytes: number): string[] =>
  gzipBytes > PAGE_PAYLOAD_BUDGET_GZIP_BYTES
    ? [`${page}: payload ${gzipBytes} B gzipped, over ${PAGE_PAYLOAD_BUDGET_GZIP_BYTES} B`]
    : [];
