/* eslint-disable @typescript-eslint/explicit-function-return-type -- plain CommonJS config */
const throttling = require('./lighthouse-throttling.cjs');

const BASE = `http://localhost:${process.env.PORT ?? '3777'}`;

const lcp = (maxNumericValue) => ['error', { maxNumericValue, aggregationMethod: 'median' }];

const commonAssertions = {
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
};

// Lighthouse (mobile, simulated slow 4G, median of 5 runs) on the generated site, on the
// runner only. LCP 2.5 s, CLS 0.1 and TBT 200 ms are the Core Web Vitals "good" thresholds
// of the plan's table; the weights are the page budgets (JS parsed on a mid-tier phone,
// images on a metered connection). Every assertion blocks: a miss is a bug to fix.
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 5,
      startServerCommand: `node infrastructure/performance/mock-api.cjs & pnpm dlx serve@14.2.4 .output/public -l ${process.env.PORT ?? '3777'}`,
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
      assertMatrix: [
        // Text pages: LCP 3 s, maintainer agreement of 2026-11-27 (cause: the entry script, counted by
        // Lantern). Photo pages keep the 2.5 s of the plan's table.
        {
          matchingUrlPattern: `^${BASE}/(composer|courses)?$`,
          assertions: { ...commonAssertions, 'largest-contentful-paint': lcp(3000) },
        },
        {
          matchingUrlPattern: `^${BASE}/(recettes|recette/.*)$`,
          assertions: { ...commonAssertions, 'largest-contentful-paint': lcp(2500) },
        },
      ],
    },
    upload: { target: 'filesystem', outputDir: 'lighthouse-reports' },
  },
};
