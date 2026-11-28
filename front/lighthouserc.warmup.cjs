// Three runs on the home page, only to read the host's environment.benchmarkIndex (local use: CI
// pins the slowdown to 4, see perf-calibration.cjs). It sets its own port and serves the generated
// site with a pinned static server, so it never depends on what the caller exported.
const PORT = process.env.PORT ?? '3777';

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: `pnpm dlx serve@14.2.4 .output/public -l ${PORT}`,
      // What serve prints once it listens: "Accepting connections at http://localhost:<port>".
      startServerReadyPattern: 'Accepting connections',
      startServerReadyTimeout: 120000,
      url: [`http://localhost:${PORT}/`],
      settings: { chromeFlags: '--no-sandbox', onlyCategories: ['performance'] },
    },
  },
};
