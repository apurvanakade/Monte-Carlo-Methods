/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The methods behind gibbs_2d.qmd: the Gibbs sampler for the joint
// exponential density on [0, D1] x [0, D2] (the bivariate normal chain comes
// from the library, VM.mcmc.gibbsBivariateNormal), the target densities, and
// the numbers the bivariate-normal app derives from a chain. Imported by the
// page's OJS cells and by method.test.js. Pure functions of numbers
// and a random source `rng` (a function returning uniforms on [0, 1), e.g.
// from VM.sampling.seededRandom); no DOM, no OJS.

// Unnormalized joint exponential density c exp(-lambda x y) on [0, D1] x [0, D2].
export function jointExponentialDensity(x, y, lambda, D1, D2) {
  if (x < 0 || x > D1 || y < 0 || y > D2) return 0
  return Math.exp(-lambda * x * y)
}

// Standard bivariate normal density with correlation rho.
export function bivariateNormalDensity(x, y, rho) {
  const q = (x * x - 2 * rho * x * y + y * y) / (1 - rho * rho)
  return Math.exp(-q / 2) / (2 * Math.PI * Math.sqrt(1 - rho * rho))
}

// One draw from Exp(rate) truncated to [0, D], by the inverse transform
// X = -log(1 - U (1 - e^{-rate D})) / rate. At rate 0 it is uniform.
export function truncatedExponential(rate, D, u) {
  if (rate === 0) return D * u
  return -Math.log(1 - u * (1 - Math.exp(-rate * D))) / rate
}

// A density on a square grid [lo, hi]^2 with `count` points per side, as the
// {x, y, z} Plotly's contour and surface traces take.
export function densityGrid(density, lo, hi, count) {
  const xs = [], z = []
  for (let i = 0; i < count; i++) xs.push(lo + (hi - lo) * i / (count - 1))
  for (const y of xs) {
    const row = []
    for (const x of xs) row.push(density(x, y))
    z.push(row)
  }
  return {x: xs, y: xs, z}
}

// Gibbs sampler for the joint exponential from (x0, y0): n sweeps of
// X_i ~ Exp(lambda Y_{i-1}) on [0, D1], then Y_i ~ Exp(lambda X_i) on [0, D2].
// Returns the chain including the start, so x and y have length n + 1.
export function gibbsJointExponential(rng, n, lambda, D1, D2, x0, y0) {
  const x = [x0], y = [y0]
  for (let i = 0; i < n; i++) {
    const nextX = truncatedExponential(lambda * y[i], D1, rng())
    x.push(nextX)
    y.push(truncatedExponential(lambda * nextX, D2, rng()))
  }
  return {x, y}
}

// The samples after sweeps 1..n of a chain (the start is not a sample), with
// their means and sample correlation (NaN if a coordinate is constant).
export function chainSummary(chain, n) {
  const xs = chain.x.slice(1, n + 1)
  const ys = chain.y.slice(1, n + 1)
  let mx = 0, my = 0
  for (let i = 0; i < n; i++) {
    mx += xs[i]
    my += ys[i]
  }
  mx /= n
  my /= n
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my)
    sxx += (xs[i] - mx) * (xs[i] - mx)
    syy += (ys[i] - my) * (ys[i] - my)
  }
  let corr = NaN
  if (sxx > 0 && syy > 0) corr = sxy / Math.sqrt(sxx * syy)
  return {n, xs, ys, mx, my, corr}
}

// Contours of the standard bivariate normal at Mahalanobis radius 1, 2, 3: the
// image of a circle of that radius under the Cholesky factor of
// [[1, rho], [rho, 1]]. Each contour is closed and followed by a null gap.
export function normalContours(rho) {
  const x = [], y = []
  const s = Math.sqrt(1 - rho * rho)
  for (const r of [1, 2, 3]) {
    for (let k = 0; k <= 160; k++) {
      const a = 2 * Math.PI * k / 160
      x.push(r * Math.cos(a))
      y.push(r * (rho * Math.cos(a) + s * Math.sin(a)))
    }
    x.push(null)
    y.push(null)
  }
  return {x, y}
}

// The path of sweeps 1..n through a chain from gibbsBivariateNormal: start,
// then for each sweep the half step (new X, old Y) and the full step.
export function staircasePath(chain, n) {
  const x = [chain.x[0]], y = [chain.y[0]]
  for (let t = 1; t <= n; t++) {
    x.push(chain.halfX[t], chain.x[t])
    y.push(chain.halfY[t], chain.y[t])
  }
  return {x, y}
}

// The theoretical autocorrelation of each coordinate of the bivariate normal
// Gibbs chain at lags 0..maxLag, rho^(2k).
export function gibbsAcfTheory(rho, maxLag) {
  const out = []
  for (let k = 0; k <= maxLag; k++) out.push(Math.pow(rho * rho, k))
  return out
}
