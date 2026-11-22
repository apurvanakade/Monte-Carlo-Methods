/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The methods behind chapters/estimating-integrals/index.qmd: the sample-mean
// and hit-or-miss estimators of a one-dimensional integral, the midpoint rule,
// the integral of exp(-|x|^2) over the cube [0, 1]^d by random, grid and
// Halton points, the volume of the unit ball by hit-or-miss, and the star
// discrepancy of a point set. Imported by the page's OJS cells and by
// method.test.js. Functions of numbers and a random source `rng` (a function
// returning uniforms on [0, 1), e.g. from VM.sampling.seededRandom); the
// library is read as globalThis.VM; no DOM, no OJS.

// ---------------------------------------------------------------------------
// One dimension
// ---------------------------------------------------------------------------

// The integrands of the two apps: f on [a, b] with 0 <= f <= max there, and
// the exact integral. Keys are the apps' URL values.
export const integrands = {
  sin: {label: "sin x on [0, π]", f: x => Math.sin(x), a: 0, b: Math.PI, max: 1, exact: 2},
  sin2: {label: "sin² x on [0, π]", f: x => Math.sin(x) ** 2, a: 0, b: Math.PI, max: 1, exact: Math.PI / 2},
  sin2fast: {label: "sin²(10x) on [0, π]", f: x => Math.sin(10 * x) ** 2, a: 0, b: Math.PI, max: 1, exact: Math.PI / 2},
  circle: {label: "4√(1 − x²) on [0, 1]", f: x => 4 * Math.sqrt(1 - x * x), a: 0, b: 1, max: 4, exact: Math.PI},
  gauss: {label: "exp(−x²) on [0, 1]", f: x => Math.exp(-x * x), a: 0, b: 1, max: 1, exact: 0.7468241328124271}
}

// n uniform points (x, y) in the box [a, b] x [0, c], for hit-or-miss with a
// box of height c >= integrand.max. under[i] says whether point i lies under
// the curve (ys[i] <= f(xs[i])), and hits[i] counts the hits among the first
// i points. Each y is c times its uniform draw, so with equal seeds a taller
// box stretches the same points upward.
export function hitMissSample(rng, integrand, c, n) {
  const xs = [], ys = [], under = [], hits = [0]
  for (let i = 0; i < n; i++) {
    const x = integrand.a + (integrand.b - integrand.a) * rng()
    const y = c * rng()
    const hit = y <= integrand.f(x)
    xs.push(x)
    ys.push(y)
    under.push(hit)
    let count = hits[i]
    if (hit) count++
    hits.push(count)
  }
  return {xs, ys, under, hits}
}

// n uniform points x in [a, b] with their heights fs[i] = f(xs[i]), for the
// sample-mean estimator. sumF[i] and sumF2[i] are the sums of f and of f^2
// over the first i points.
export function sampleMeanSample(rng, integrand, n) {
  const xs = [], fs = [], sumF = [0], sumF2 = [0]
  for (let i = 0; i < n; i++) {
    const x = integrand.a + (integrand.b - integrand.a) * rng()
    const fx = integrand.f(x)
    xs.push(x)
    fs.push(fx)
    sumF.push(sumF[i] + fx)
    sumF2.push(sumF2[i] + fx * fx)
  }
  return {xs, fs, sumF, sumF2}
}

// The sample-mean estimate width * mean(f) from the sums of f and f^2 over n
// points, and its estimated standard error width * s / sqrt(n), s the sample
// standard deviation (divisor n - 1; null when n < 2).
export function sampleMeanEstimate(sumF, sumF2, n, width) {
  const mean = sumF / n
  let stdError = null
  if (n >= 2) {
    const variance = Math.max(0, (sumF2 - n * mean * mean) / (n - 1))
    stdError = width * Math.sqrt(variance / n)
  }
  return {n, mean, estimate: width * mean, stdError}
}

// The hit-or-miss estimate boxArea * hits / n and its estimated standard
// error boxArea * sqrt(p (1 - p) / n), p = hits / n.
export function hitMissEstimate(hits, n, boxArea) {
  const p = hits / n
  return {n, hits, estimate: boxArea * p, stdError: boxArea * Math.sqrt(p * (1 - p) / n)}
}

// The midpoint rule with n cells: h times the sum of f at the cell centers.
export function midpointRule(f, a, b, n) {
  const h = (b - a) / n
  let sum = 0
  for (let j = 0; j < n; j++) sum += f(a + (j + 0.5) * h)
  return h * sum
}

// The midpoint rule's error |estimate - exact| at each n in counts.
export function midpointErrors(f, a, b, exact, counts) {
  const points = []
  for (const n of counts) points.push({n, error: Math.abs(midpointRule(f, a, b, n) - exact)})
  return points
}

// Sample sizes from 10 to max, about perDecade per decade, rounded to
// integers.
export function checkpoints(max, perDecade = 8) {
  const out = []
  const top = Math.log10(max)
  for (let k = 0; ; k++) {
    const e = 1 + k / perDecade
    if (e > top + 1e-9) break
    const n = Math.round(10 ** e)
    if (out.length === 0 || n > out[out.length - 1]) out.push(n)
  }
  if (out[out.length - 1] !== max) out.push(max)
  return out
}

function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

// The RMS and the 10% and 90% quantiles (lo, hi) of each list in errors, where
// errors[k] holds the errors at n = counts[k].
function errorSummary(counts, errors) {
  const points = []
  for (let k = 0; k < counts.length; k++) {
    const sorted = errors[k].slice().sort((a, b) => a - b)
    let sumSquares = 0
    for (const e of sorted) sumSquares += e * e
    points.push({n: counts[k], error: Math.sqrt(sumSquares / sorted.length), lo: quantile(sorted, 0.1), hi: quantile(sorted, 0.9)})
  }
  return points
}

// The errors of both estimators of the integrand's integral at each n in
// counts (increasing), over `runs` independent runs that add points one at a
// time. Each run's points serve both estimators, as in the app. Returns
// {sampleMean, hitMiss}, each a list of {n, error, lo, hi}: the RMS error and
// the 10% and 90% quantiles of |estimate - exact|.
export function integrandErrors(rng, integrand, counts, runs) {
  const width = integrand.b - integrand.a
  const meanErrors = [], hitErrors = []
  for (let k = 0; k < counts.length; k++) {
    meanErrors.push([])
    hitErrors.push([])
  }
  for (let run = 0; run < runs; run++) {
    let sum = 0, hits = 0, next = 0
    for (let i = 1; i <= counts[counts.length - 1]; i++) {
      const fx = integrand.f(integrand.a + width * rng())
      if (integrand.max * rng() <= fx) hits++
      sum += fx
      if (i === counts[next]) {
        meanErrors[next].push(Math.abs(width * sum / i - integrand.exact))
        hitErrors[next].push(Math.abs(width * integrand.max * hits / i - integrand.exact))
        next++
      }
    }
  }
  return {sampleMean: errorSummary(counts, meanErrors), hitMiss: errorSummary(counts, hitErrors)}
}

// ---------------------------------------------------------------------------
// exp(-|x|^2) on the cube [0, 1]^d
// ---------------------------------------------------------------------------

// The exact integral of exp(-|x|^2) over [0, 1]^d:
// (int_0^1 e^{-t^2} dt)^d = (sqrt(pi)/2 erf(1))^d, and erf(1) = 2 Phi(sqrt 2) - 1.
export function gaussianCubeExact(d) {
  const oneDim = Math.sqrt(Math.PI) / 2 * (2 * globalThis.VM.distributions.normalCdf(Math.SQRT2) - 1)
  return Math.pow(oneDim, d)
}

// The standard deviation of f(U) = exp(-|U|^2), U uniform on [0, 1]^d:
// E[f^2] = (int_0^1 e^{-2 t^2} dt)^d = (sqrt(pi/8) erf(sqrt 2))^d, and
// erf(sqrt 2) = 2 Phi(2) - 1.
export function gaussianCubeSd(d) {
  const secondMoment = Math.sqrt(Math.PI / 8) * (2 * globalThis.VM.distributions.normalCdf(2) - 1)
  const mean = gaussianCubeExact(d)
  return Math.sqrt(Math.pow(secondMoment, d) - mean * mean)
}

// The relative error |estimate / exact - 1| of the Monte Carlo estimate of the
// integral of exp(-|x|^2) over [0, 1]^d at each n in counts (increasing), over
// `runs` independent runs: {n, error, lo, hi} as in integrandErrors.
export function gaussianCubeRandomErrors(rng, d, counts, runs) {
  const exact = gaussianCubeExact(d)
  const errors = []
  for (let k = 0; k < counts.length; k++) errors.push([])
  for (let run = 0; run < runs; run++) {
    let sum = 0, next = 0
    for (let i = 1; i <= counts[counts.length - 1]; i++) {
      let normSq = 0
      for (let k = 0; k < d; k++) {
        const x = rng()
        normSq += x * x
      }
      sum += Math.exp(-normSq)
      if (i === counts[next]) {
        errors[next].push(Math.abs(sum / i / exact - 1))
        next++
      }
    }
  }
  return errorSummary(counts, errors)
}

// The product midpoint rule with m points per axis, for every m with
// m^d <= maxN: {n: m^d, m, error}, error the relative error. The integrand is
// a product, so the grid sum is the one-dimensional midpoint sum to the power
// d and never visits the m^d points.
export function gaussianCubeGridErrors(d, maxN) {
  const exact = gaussianCubeExact(d)
  const g = t => Math.exp(-t * t)
  const points = []
  for (let m = 1; Math.pow(m, d) <= maxN; m++) {
    const estimate = Math.pow(midpointRule(g, 0, 1, m), d)
    points.push({n: Math.pow(m, d), m, error: Math.abs(estimate / exact - 1)})
    // In one dimension every m up to maxN qualifies; 1000 cells is past
    // any chart's need.
    if (m >= 1000) break
  }
  return points
}

// ---------------------------------------------------------------------------
// Quasi-random points
// ---------------------------------------------------------------------------

// The first twelve primes: the bases of the Halton sequence in up to twelve
// dimensions.
export const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]

// The i-th term of the van der Corput sequence in the given base: i's digits
// mirrored about the radix point.
export function vanDerCorput(i, base) {
  let value = 0
  let scale = 1 / base
  let k = i
  while (k > 0) {
    value += (k % base) * scale
    k = Math.floor(k / base)
    scale /= base
  }
  return value
}

// The relative error of the Halton estimate (points 1, ..., n, bases the
// first d primes) of the integral of exp(-|x|^2) over [0, 1]^d at each n in
// counts (increasing): {n, error}.
export function gaussianCubeHaltonErrors(d, counts) {
  const exact = gaussianCubeExact(d)
  const points = []
  let sum = 0, next = 0
  for (let i = 1; i <= counts[counts.length - 1]; i++) {
    let normSq = 0
    for (let k = 0; k < d; k++) {
      const x = vanDerCorput(i, primes[k])
      normSq += x * x
    }
    sum += Math.exp(-normSq)
    if (i === counts[next]) {
      points.push({n: i, error: Math.abs(sum / i / exact - 1)})
      next++
    }
  }
  return points
}

// The same with a random shift: each of `shifts` runs draws one uniform
// vector from rng and adds it to every Halton point, modulo 1 in each
// coordinate. {n, error, lo, hi} over the shifts, as in integrandErrors.
export function gaussianCubeShiftedErrors(rng, d, counts, shifts) {
  const exact = gaussianCubeExact(d)
  const last = counts[counts.length - 1]
  // The unshifted coordinates, computed once: halton[k][i - 1] is point i's
  // k-th coordinate.
  const halton = []
  for (let k = 0; k < d; k++) {
    const column = new Float64Array(last)
    for (let i = 1; i <= last; i++) column[i - 1] = vanDerCorput(i, primes[k])
    halton.push(column)
  }
  const errors = []
  for (let k = 0; k < counts.length; k++) errors.push([])
  for (let s = 0; s < shifts; s++) {
    const shift = []
    for (let k = 0; k < d; k++) shift.push(rng())
    let sum = 0, next = 0
    for (let i = 1; i <= last; i++) {
      let normSq = 0
      for (let k = 0; k < d; k++) {
        let x = halton[k][i - 1] + shift[k]
        if (x >= 1) x -= 1
        normSq += x * x
      }
      sum += Math.exp(-normSq)
      if (i === counts[next]) {
        errors[next].push(Math.abs(sum / i / exact - 1))
        next++
      }
    }
  }
  return errorSummary(counts, errors)
}

// The app's point sets in the unit square, n points each: "random" (uniform,
// from rng), "grid" (the centers of an m x m grid of cells, m = floor(sqrt n),
// so m^2 <= n points), or "halton-b1-b2" (the Halton points 1, ..., n in
// bases b1 and b2).
export function pointSet(kind, n, rng) {
  const xs = [], ys = []
  if (kind === "random") {
    for (let i = 0; i < n; i++) {
      xs.push(rng())
      ys.push(rng())
    }
  } else if (kind === "grid") {
    const m = Math.floor(Math.sqrt(n))
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        xs.push((i + 0.5) / m)
        ys.push((j + 0.5) / m)
      }
    }
  } else {
    const parts = kind.split("-")
    const b1 = Number(parts[1]), b2 = Number(parts[2])
    for (let i = 1; i <= n; i++) {
      xs.push(vanDerCorput(i, b1))
      ys.push(vanDerCorput(i, b2))
    }
  }
  return {xs, ys}
}

// The number of points in the box [0, x) x [0, y).
export function boxCount(xs, ys, x, y) {
  let count = 0
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] < x && ys[i] < y) count++
  }
  return count
}

// The star discrepancy of points in [0, 1]: the largest gap, over t, between
// the fraction of points in [0, t) and t. With the points sorted,
// x(1) <= ... <= x(N), it is the largest of i/N - x(i) and x(i) - (i - 1)/N.
export function starDiscrepancy1d(points) {
  const sorted = Array.from(points).sort((a, b) => a - b)
  const n = sorted.length
  let worst = 0
  for (let i = 0; i < n; i++) {
    worst = Math.max(worst, (i + 1) / n - sorted[i], sorted[i] - i / n)
  }
  return worst
}

// The distinct values of a list, increasing.
function sortedUnique(values) {
  const sorted = Array.from(values).sort((a, b) => a - b)
  const out = []
  for (const v of sorted) {
    if (out.length === 0 || v > out[out.length - 1]) out.push(v)
  }
  return out
}

// The star discrepancy of points in the unit square: the largest gap, over
// boxes [0, x) x [0, y), between the fraction of points in the box and its
// area xy. The gap can only peak at a box whose sides pass through points'
// coordinates (or 1): just past them, where the count is highest for the
// area, or just before the next ones, where the area is highest for the
// count. With X and Y the distinct coordinates, this checks all |X| |Y| such
// corners, from a table of the counts C(i, j) of points with x <= X[i - 1]
// and y <= Y[j - 1].
export function starDiscrepancy2d(xs, ys) {
  const n = xs.length
  if (n === 0) return 1
  const X = sortedUnique(xs), Y = sortedUnique(ys)
  const columns = Y.length + 1
  const xIndex = new Map(), yIndex = new Map()
  for (let i = 0; i < X.length; i++) xIndex.set(X[i], i + 1)
  for (let j = 0; j < Y.length; j++) yIndex.set(Y[j], j + 1)
  // counts[i * columns + j] starts as the number of points at (X[i-1], Y[j-1])
  // and becomes C(i, j) by a running sum over both indices.
  const counts = new Int32Array((X.length + 1) * columns)
  for (let k = 0; k < n; k++) counts[xIndex.get(xs[k]) * columns + yIndex.get(ys[k])]++
  for (let i = 1; i <= X.length; i++) {
    for (let j = 1; j <= Y.length; j++) {
      counts[i * columns + j] += counts[(i - 1) * columns + j] + counts[i * columns + j - 1] - counts[(i - 1) * columns + j - 1]
    }
  }
  let worst = 0
  for (let i = 0; i <= X.length; i++) {
    // The next coordinate after X[i - 1], or 1 past the last.
    let nextX = 1
    if (i < X.length) nextX = X[i]
    for (let j = 0; j <= Y.length; j++) {
      let nextY = 1
      if (j < Y.length) nextY = Y[j]
      const fraction = counts[i * columns + j] / n
      // The open box up to the next coordinates holds the same points.
      worst = Math.max(worst, nextX * nextY - fraction)
      // The box just past (X[i - 1], Y[j - 1]).
      if (i > 0 && j > 0) worst = Math.max(worst, fraction - X[i - 1] * Y[j - 1])
    }
  }
  return worst
}

// The star discrepancy of the first n points in [0, 1], at each n in counts,
// for three kinds of points: the van der Corput sequence in base 2, the
// midpoint grid (a new grid for each n), and random points, over `runs`
// independent runs ({n, error, lo, hi}: the RMS and the 10% and 90%
// quantiles). Each random run is one sequence, cut at each n.
export function discrepancyStudy(rng, counts, runs) {
  const last = counts[counts.length - 1]
  const vdc = []
  for (let i = 1; i <= last; i++) vdc.push(vanDerCorput(i, 2))
  const corput = [], grid = []
  for (const n of counts) {
    corput.push({n, error: starDiscrepancy1d(vdc.slice(0, n))})
    const midpoints = []
    for (let j = 0; j < n; j++) midpoints.push((j + 0.5) / n)
    grid.push({n, error: starDiscrepancy1d(midpoints)})
  }
  const values = []
  for (let k = 0; k < counts.length; k++) values.push([])
  for (let run = 0; run < runs; run++) {
    const points = []
    for (let i = 0; i < last; i++) points.push(rng())
    for (let k = 0; k < counts.length; k++) values[k].push(starDiscrepancy1d(points.slice(0, counts[k])))
  }
  return {corput, grid, random: errorSummary(counts, values)}
}

// ---------------------------------------------------------------------------
// Fitted rates
// ---------------------------------------------------------------------------

// The least-squares line through (log10 n, log10 error) over n >= 100,
// skipping errors at rounding level: error ≈ 10^intercept * n^(-order).
// null with fewer than two points. Uses VM.numerical.linearRegression.
export function convergenceFit(points) {
  const logPoints = []
  for (const p of points) {
    if (p.n >= 100 && p.error > 1e-14) logPoints.push({x: Math.log10(p.n), y: Math.log10(p.error)})
  }
  if (logPoints.length < 2) return null
  const fit = globalThis.VM.numerical.linearRegression(logPoints)
  if (!fit) return null
  return {order: -fit.slope, intercept: fit.intercept}
}
