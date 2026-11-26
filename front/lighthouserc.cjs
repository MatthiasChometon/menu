const throttling = require('./lighthouse-throttling.cjs');

const BASE = `http://localhost:${process.env.PORT ?? '3777'}`;

// Lighthouse (mobile, simulated slow 4G, median of 5 runs) on the generated site, on the
// runner only. LCP 2.5 s, CLS 0.1 and TBT 200 ms are the Core Web Vitals "good" thresholds
// of the plan's table; the weights are the page budgets (JS parsed on a mid-tier phone,
// images on a metered connection). Every assertion blocks: a miss is a bug to fix.
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 5,
      startServerCommand: `pnpm dlx serve@14.2.4 .output/public -l ${process.env.PORT ?? '3777'}`,
      // What serve prints once it listens: "Accepting connections at http://localhost:<port>".
      startServerReadyPattern: 'Accepting connections',
      startServerReadyTimeout: 120000,
      url: [
        `${BASE}/`,
        `${BASE}/courses`,
        `${BASE}/recettes`,
        `${BASE}/recette/thaiPeanutChickenBowl`,
        `${BASE}/composer`,
      ],
      settings: { chromeFlags: '--no-sandbox', throttling },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': [
          'error',
          { maxNumericValue: 2500, aggregationMethod: 'median' },
        ],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median' }],
        'total-blocking-time': ['error', { maxNumericValue: 200, aggregationMethod: 'median' }],
        'resource-summary:script:size': [
          'error',
          { maxNumericValue: 350 * 1024, aggregationMethod: 'median' },
        ],
        'resource-summary:image:size': [
          'error',
          { maxNumericValue: 1500 * 1024, aggregationMethod: 'median' },
        ],
      },
    },
    upload: { target: 'filesystem', outputDir: 'lighthouse-reports' },
  },
};
