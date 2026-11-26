// The CPU slowdown that makes every runner emulate the same reference device: a mid-tier mobile
// (Moto G4 class). The multiplier is computed by `lighthouse-calibrate.cjs` from the host's
// benchmarkIndex and passed in LH_CPU_SLOWDOWN; 4 is Lighthouse's default when it is absent.
const slowdown = Number(process.env.LH_CPU_SLOWDOWN ?? 4);

module.exports = { cpuSlowdownMultiplier: slowdown };
