/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The simulations behind bootstrap.qmd: non-parametric and parametric
// bootstrap of a sample mean and of a tail probability. Imported by the
// page's OJS cells and by method.test.js. Pure functions of numbers
// and a random source `rng` (uniforms on [0, 1), e.g. from
// VM.sampling.seededRandom); the mathviz library is read as globalThis.VM.

// n draws from N(mean, sd^2), using the standard-normal source `gaussian`.
export function normalSample(n, mean, sd, gaussian) {
  const out = []
  for (let i = 0; i < n; i++) out.push(mean + sd * gaussian())
  return out
}

// B bootstrap replicates of statistic(resample), each resample drawn from
// `data` with replacement.
export function bootstrap(data, statistic, B, rng) {
  const out = []
  const n = data.length
  for (let b = 0; b < B; b++) {
    const resample = []
    for (let i = 0; i < n; i++) resample.push(data[Math.floor(rng() * n)])
    out.push(statistic(resample))
  }
  return out
}

export function sampleMean(values) {
  return globalThis.VM.distributions.sampleStats(values).mean
}

// A N(0, 1) sample of size n (seeded by `rng`'s gaussian source) and the
// bootstrap distribution of its mean, with the normal approximation
// N(xbar, s^2 / n) it should approach.
function meanRun(n, rng, gaussian, B) {
  const sample = normalSample(n, 0, 1, gaussian)
  const stats = globalThis.VM.distributions.sampleStats(sample)
  const boot = bootstrap(sample, sampleMean, B, rng)
  return {n, sample, boot, center: stats.mean, se: stats.sd / Math.sqrt(n)}
}

// One shared generator (seed) across the sizes, B replicates each.
export function bootstrapMeans(sizes, B, seed) {
  const rng = globalThis.VM.sampling.seededRandom(seed)
  const gaussian = globalThis.VM.sampling.gaussianRandom(rng)
  const out = []
  for (const n of sizes) out.push(meanRun(n, rng, gaussian, B))
  return out
}

// A separate generator seeded seed0 + i for the i-th size.
export function bootstrapMeansIndependent(sizes, B, seed0) {
  const out = []
  for (let i = 0; i < sizes.length; i++) {
    const rng = globalThis.VM.sampling.seededRandom(seed0 + i)
    const gaussian = globalThis.VM.sampling.gaussianRandom(rng)
    out.push(meanRun(sizes[i], rng, gaussian, B))
  }
  return out
}

// The fraction of values above `threshold`.
export function fractionAbove(values, threshold) {
  let count = 0
  for (const v of values) {
    if (v > threshold) count++
  }
  return count / values.length
}

// A sample of n from N(mu, sigma^2) and the bootstrap distribution of the
// estimate of P(X > threshold): non-parametric (resample the data) and
// parametric (draw from the normal fitted to the data).
export function tailBootstrap({n, mu, sigma, threshold, B}) {
  const VM = globalThis.VM
  const rng = VM.sampling.seededRandom(42)
  const gaussian = VM.sampling.gaussianRandom(rng)
  const data = normalSample(n, mu, sigma, gaussian)
  // The maximum-likelihood fit: the sample mean and the n-denominator sd.
  const fit = VM.distributions.sampleStats(data, {ddof: 0})
  function aboveThreshold(values) {
    return fractionAbove(values, threshold)
  }
  const nonparametric = bootstrap(data, aboveThreshold, B, rng)
  const parametric = []
  for (let b = 0; b < B; b++) parametric.push(aboveThreshold(normalSample(n, fit.mean, fit.sd, gaussian)))
  // One resample of each kind, for the comparison plot.
  const exampleRng = VM.sampling.seededRandom(123)
  const nonparametricSample = bootstrap(data, x => x, 1, exampleRng)[0]
  const parametricSample = normalSample(n, fit.mean, fit.sd, VM.sampling.gaussianRandom(exampleRng))
  return {
    threshold, data, fit, nonparametricSample, parametricSample,
    trueProb: 1 - VM.distributions.normalCdf(threshold, mu, sigma * sigma),
    nonparametricMean: sampleMean(nonparametric),
    parametricMean: sampleMean(parametric)
  }
}
