/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The simulations behind integrals.qmd: one-dimensional Monte Carlo
// integration and the dimension study for exp(-|x|^2) on [0, 1]^d. Imported by
// the page's OJS cells and by method.test.js. Functions of numbers
// and a random source `rng` (a function returning uniforms on [0, 1), e.g.
// from VM.sampling.seededRandom); the library is read as globalThis.VM; no DOM,
// no OJS.

// (b - a) times the average of f at n uniform points in [a, b].
export function monteCarloIntegrate(f, a, b, n, rng) {
  let sum = 0
  for (let i = 0; i < n; i++) sum += f(a + (b - a) * rng())
  return (b - a) * sum / n
}

// `count` sample sizes evenly spaced on a log scale from 10^lo to 10^hi.
export function logSampleSizes(count, lo, hi) {
  const sizes = []
  for (let i = 0; i < count; i++) sizes.push(Math.floor(Math.pow(10, lo + (hi - lo) * i / (count - 1))))
  return sizes
}

// For each integrand {f, trueValue}: one estimate and absolute error per
// sample size, then `repeatRuns` independent estimates at `repeatN` samples
// (summarized by sampleStats with ddof 0, for the spread of the estimator).
// All draws come from the single `rng`, function by function.
export function integrandStudy(rng, functions, a, b, sizes, repeatN, repeatRuns) {
  const results = []
  for (const fn of functions) {
    const estimates = [], errors = []
    for (const n of sizes) {
      const estimate = monteCarloIntegrate(fn.f, a, b, n, rng)
      estimates.push(estimate)
      errors.push(Math.abs(estimate - fn.trueValue))
    }
    const repeats = []
    for (let run = 0; run < repeatRuns; run++) repeats.push(monteCarloIntegrate(fn.f, a, b, repeatN, rng))
    results.push({estimates, errors, repeat: globalThis.VM.distributions.sampleStats(repeats, {ddof: 0})})
  }
  return results
}

// The exact integral of exp(-|x|^2) over [0, 1]^d:
// (int_0^1 e^{-t^2} dt)^d = (sqrt(pi)/2 erf(1))^d, and erf(1) = 2 Phi(sqrt 2) - 1.
export function gaussianCubeExact(d) {
  const oneDim = Math.sqrt(Math.PI) / 2 * (2 * globalThis.VM.distributions.normalCdf(Math.SQRT2) - 1)
  return Math.pow(oneDim, d)
}

// One estimate of the integral of exp(-|x|^2) over [0, 1]^d from n uniform points.
export function gaussianCubeEstimate(rng, d, n) {
  let sum = 0
  for (let i = 0; i < n; i++) {
    let normSq = 0
    for (let k = 0; k < d; k++) {
      const x = rng()
      normSq += x * x
    }
    sum += Math.exp(-normSq)
  }
  return sum / n
}

// For d = 1..maxDim and each sample size: `runs` independent estimates, whose
// mean gives the relative error against the exact value and whose standard
// deviation (ddof 0) gives the spread.
export function dimensionStudy(rng, maxDim, sizes, runs) {
  const results = []
  for (let d = 1; d <= maxDim; d++) {
    const exact = gaussianCubeExact(d)
    const relErrors = [], sds = []
    for (const n of sizes) {
      const estimates = []
      for (let run = 0; run < runs; run++) estimates.push(gaussianCubeEstimate(rng, d, n))
      const stats = globalThis.VM.distributions.sampleStats(estimates, {ddof: 0})
      relErrors.push(Math.abs(stats.mean - exact) / exact)
      sds.push(stats.sd)
    }
    results.push({d, relErrors, sds})
  }
  return results
}
