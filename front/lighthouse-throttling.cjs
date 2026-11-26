// The CPU slowdown of the Lighthouse run, calibrated to this host (see perf-calibration.cjs).
const { readCalibration } = require('./perf-calibration.cjs');

module.exports = { cpuSlowdownMultiplier: readCalibration().slowdown };
