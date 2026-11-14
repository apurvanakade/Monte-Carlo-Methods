/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The methods behind estimating-pi/index.qmd: the hit-or-miss estimate of pi,
// Buffon's needle and Barbier's noodle, and the non-random Gauss circle and
// Halton estimates. None of the samplers uses pi; it appears only in the
// reported errors. Imported by the page's OJS
// cells and by method.test.js. Pure functions of numbers and a random source
// `rng` (a function returning uniforms on [0, 1), e.g. from
// VM.sampling.seededRandom); no DOM, no OJS.

// Throws `n` points uniformly in the square [-1, 1]^2. insideCount[i] counts
// the hits in the unit disk among the first i points.
export function dropPoints(rng, n) {
  const xs = [], ys = [], inside = [], insideCount = [0]
  for (let i = 0; i < n; i++) {
    const x = 2 * rng() - 1
    const y = 2 * rng() - 1
    const hit = x * x + y * y <= 1
    xs.push(x)
    ys.push(y)
    inside.push(hit)
    let count = insideCount[i]
    if (hit) count++
    insideCount.push(count)
  }
  return {xs, ys, inside, insideCount}
}

// The estimate 4 * inside / n and its estimated standard error
// 4 * sqrt(p (1 - p) / n), p = inside / n.
export function circleEstimate(inside, n) {
  const p = inside / n
  const estimate = 4 * p
  const stdError = 4 * Math.sqrt(p * (1 - p) / n)
  return {n, inside, estimate, stdError, error: Math.abs(estimate - Math.PI)}
}

// `runs` independent runs of the estimate, each adding points one at a time.
// runs[r][k] is run r's estimate 4 * inside / n at n = counts[k]; counts must
// be increasing.
export function runningCircleEstimates(rng, counts, runs) {
  const out = []
  for (let run = 0; run < runs; run++) {
    const estimates = []
    let inside = 0
    let next = 0
    for (let i = 1; i <= counts[counts.length - 1]; i++) {
      const x = 2 * rng() - 1
      const y = 2 * rng() - 1
      if (x * x + y * y <= 1) inside++
      if (i === counts[next]) {
        estimates.push(4 * inside / i)
        next++
      }
    }
    out.push(estimates)
  }
  return out
}

// A uniformly random direction as a unit vector [c, s], without using pi:
// a point drawn uniformly in the unit disk, by rejection from the square,
// then scaled to length 1.
export function randomDirection(rng) {
  for (;;) {
    const u = 2 * rng() - 1
    const v = 2 * rng() - 1
    const r2 = u * u + v * v
    if (r2 > 1e-12 && r2 <= 1) {
      const r = Math.sqrt(r2)
      return [u / r, v / r]
    }
  }
}

// Each drop's center (uniform on a width x height board) and direction
// (a unit vector [c[i], s[i]] from randomDirection).
export function dropNeedles(rng, n, width, height) {
  const cx = [], cy = [], c = [], s = []
  for (let i = 0; i < n; i++) {
    cx.push(width * rng())
    cy.push(height * rng())
    const [ci, si] = randomDirection(rng)
    c.push(ci)
    s.push(si)
  }
  return {cx, cy, c, s}
}

// The shapes dropped, as polylines of total length 1 about their centers:
// the needle, and Barbier's noodle, a zigzag of three straight pieces of
// length 1/3 each (steps of (0.8, +-0.6) / 3).
export const buffonShapes = {
  needle: [[-0.5, 0], [0.5, 0]],
  noodle: [[-0.4, -0.1], [-0.4 / 3, 0.1], [0.4 / 3, -0.1], [0.4, 0.1]]
}

// Each drop of the shape, scaled to total length `length` and turned to its
// direction, over lines spaced `spacing` apart. A straight piece crosses as
// many lines as there are strip boundaries between its ends, so a noodle can
// cross more than once. xs[i], ys[i] are drop i's polyline; crossingCount[i]
// and crossingSquares[i] sum the crossings and their squares over the first
// i drops.
export function needleCrossings(drops, length, spacing, shape = "needle") {
  const unit = buffonShapes[shape]
  const n = drops.cx.length
  const xs = [], ys = [], crossings = [], crossingCount = [0], crossingSquares = [0]
  for (let i = 0; i < n; i++) {
    const px = [], py = []
    for (const [u, v] of unit) {
      px.push(drops.cx[i] + length * (drops.c[i] * u - drops.s[i] * v))
      py.push(drops.cy[i] + length * (drops.s[i] * u + drops.c[i] * v))
    }
    let k = 0
    for (let j = 1; j < px.length; j++) {
      k += Math.abs(Math.floor(py[j] / spacing) - Math.floor(py[j - 1] / spacing))
    }
    xs.push(px)
    ys.push(py)
    crossings.push(k)
    crossingCount.push(crossingCount[i] + k)
    crossingSquares.push(crossingSquares[i] + k * k)
  }
  return {xs, ys, crossings, crossingCount, crossingSquares}
}

// Buffon's (and Barbier's) estimator 2 l n / (t C), C the total number of
// crossings, and its delta-method standard error (2 l / t) sd / (sqrt(n) m^2),
// m and sd the mean and standard deviation of the crossings per drop. For the
// needle, crossings are 0 or 1 and this is (2 l / t) sqrt((1 - p) / (n p^3)),
// p = C / n. Undefined before the first crossing.
export function buffonEstimate(crossings, crossingSquares, n, length, spacing) {
  if (crossings === 0) return {n, crossings, estimate: null, stdError: null, error: null}
  const mean = crossings / n
  const variance = Math.max(0, crossingSquares / n - mean * mean)
  const estimate = (2 * length * n) / (spacing * crossings)
  const stdError = (2 * length / spacing) * Math.sqrt(variance / n) / (mean * mean)
  return {n, crossings, estimate, stdError, error: Math.abs(estimate - Math.PI)}
}

// The number of integer points (x, y) with x^2 + y^2 <= r^2, counted column
// by column with an exact integer square root.
export function latticeCount(r) {
  let count = 0
  for (let x = -r; x <= r; x++) {
    const rest = r * r - x * x
    let h = Math.floor(Math.sqrt(rest))
    while (h * h > rest) h--
    while ((h + 1) * (h + 1) <= rest) h++
    count += 2 * h + 1
  }
  return count
}

// The Gauss circle estimate latticeCount(r) / r^2.
export function latticeEstimate(r) {
  const count = latticeCount(r)
  const estimate = count / (r * r)
  return {r, count, estimate, error: Math.abs(estimate - Math.PI)}
}

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

// The first n points of the 2-3 Halton sequence (indices 1, ..., n), mapped
// to the square [-1, 1]^2, in dropPoints' format.
export function haltonPoints(n) {
  const xs = [], ys = [], inside = [], insideCount = [0]
  for (let i = 1; i <= n; i++) {
    const x = 2 * vanDerCorput(i, 2) - 1
    const y = 2 * vanDerCorput(i, 3) - 1
    const hit = x * x + y * y <= 1
    xs.push(x)
    ys.push(y)
    inside.push(hit)
    let count = insideCount[i - 1]
    if (hit) count++
    insideCount.push(count)
  }
  return {xs, ys, inside, insideCount}
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

// The circle method's error at each n in counts, over `runs` independent
// runs drawn one after another from rng: the RMS error, and the 10% and 90%
// quantiles of |estimate - pi| (lo, hi).
export function randomCircleErrors(rng, counts, runs) {
  const errors = []
  for (let k = 0; k < counts.length; k++) errors.push([])
  for (let run = 0; run < runs; run++) {
    let inside = 0
    let next = 0
    for (let i = 1; i <= counts[counts.length - 1]; i++) {
      const x = 2 * rng() - 1
      const y = 2 * rng() - 1
      if (x * x + y * y <= 1) inside++
      if (i === counts[next]) {
        errors[next].push(Math.abs(4 * inside / i - Math.PI))
        next++
      }
    }
  }
  return errorSummary(counts, errors)
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

// One run of Buffon's estimator 2 l n / (t C), dropping needles one at a time:
// its value at each n in counts (increasing), or null before the first
// crossing. Only each needle's height and direction matter, so this skips the
// polylines that needleCrossings builds for drawing.
function buffonRun(rng, counts, length, spacing) {
  const estimates = []
  let crossings = 0
  let next = 0
  for (let i = 1; i <= counts[counts.length - 1]; i++) {
    const y = spacing * rng()
    const [, s] = randomDirection(rng)
    const low = y - (length / 2) * s
    const high = y + (length / 2) * s
    if (Math.floor(low / spacing) !== Math.floor(high / spacing)) crossings++
    if (i === counts[next]) {
      if (crossings === 0) estimates.push(null)
      else estimates.push((2 * length * i) / (spacing * crossings))
      next++
    }
  }
  return estimates
}

// `runs` independent runs of Buffon's estimator. runs[r][k] is run r's estimate
// at n = counts[k], or null before its first crossing.
export function runningBuffonEstimates(rng, counts, runs, length, spacing) {
  const out = []
  for (let run = 0; run < runs; run++) out.push(buffonRun(rng, counts, length, spacing))
  return out
}

// Buffon's error at each n in counts over `runs` independent runs, as in
// randomCircleErrors. A run with no crossing yet has no estimate and is left
// out at that n, so these describe the estimator given C >= 1.
export function randomBuffonErrors(rng, counts, runs, length, spacing) {
  const errors = []
  for (let k = 0; k < counts.length; k++) errors.push([])
  for (let run = 0; run < runs; run++) {
    const estimates = buffonRun(rng, counts, length, spacing)
    for (let k = 0; k < counts.length; k++) {
      if (estimates[k] !== null) errors[k].push(Math.abs(estimates[k] - Math.PI))
    }
  }
  return errorSummary(counts, errors)
}

// The Halton circle estimate's error at each n in counts.
export function haltonCircleErrors(counts) {
  const h = haltonPoints(counts[counts.length - 1])
  const points = []
  for (const n of counts) points.push({n, error: Math.abs(4 * h.insideCount[n] / n - Math.PI)})
  return points
}

// The Gauss circle estimate's error against the radius, as points {n: r,
// error}: at every radius up to 1000, then about 400 radii per decade up to
// maxR. Dense, not a light sample: the error jumps about from one radius to
// the next, and a fit through a few radii swings with the choice of radii.
export function latticeErrors(maxR) {
  const radii = []
  for (let r = 1; r <= Math.min(1000, maxR); r++) radii.push(r)
  if (maxR > 1000) {
    for (const r of checkpoints(maxR, 400)) {
      if (r > 1000) radii.push(r)
    }
  }
  const points = []
  for (const r of radii) points.push({n: r, error: latticeEstimate(r).error})
  return points
}

// The least-squares line through (log10 n, log10 error) over n >= 100 (n is
// the number of points, or the radius r for the Gauss circle method),
// skipping errors at rounding level: error ≈ 10^intercept * n^(-order).
// null with fewer than two points. Uses VM.numerical.linearRegression.
export function convergenceFit(points) {
  const logPoints = []
  for (const p of points) {
    if (p.n >= 100 && p.error > 1e-14) logPoints.push({x: Math.log10(p.n), y: Math.log10(p.error)})
  }
  const fit = globalThis.VM.numerical.linearRegression(logPoints)
  if (!fit) return null
  return {order: -fit.slope, intercept: fit.intercept}
}

// The fitted order of convergence, minus the slope of convergenceFit's line;
// NaN with fewer than two points.
export function convergenceOrder(points) {
  const fit = convergenceFit(points)
  if (!fit) return NaN
  return fit.order
}
