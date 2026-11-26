// Three runs on the home page, only to read the host's environment.benchmarkIndex.
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: 'pnpm preview',
      startServerReadyPattern: 'Listening',
      startServerReadyTimeout: 60000,
      url: [`http://localhost:${process.env.PORT ?? '3777'}/`],
      settings: { chromeFlags: '--no-sandbox', onlyCategories: ['performance'] },
    },
  },
};
