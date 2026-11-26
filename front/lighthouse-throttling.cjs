// The CPU slowdown of the Lighthouse run: a fixed 4x, the PageSpeed Insights reference for a
// mid-tier mobile, so the figures read here are the ones PageSpeed Insights reports (maintainer
// approval 2026-11-26). It is not calibrated per runner: a calibrated multiplier made the same
// code score differently from one runner to the next.
module.exports = { cpuSlowdownMultiplier: 4 };
