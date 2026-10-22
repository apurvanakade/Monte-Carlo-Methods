/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The methods behind estimating-pi/index.qmd: the hit-or-miss estimate of pi,
// Buffon's needle and Barbier's noodle, and the non-random Gauss circle and
// Halton estimates. None of the samplers uses pi; it appears only in the
// reported errors and the theoretical intervals. Imported by the page's OJS
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

// One independent estimate per sample size 100, 200, ..., maxN, each with its
// theoretical 95% interval estimate +- z sqrt(pi (4 - pi) / n).
export function circleConvergence(rng, maxN, z) {
  const sizes = [], estimates = [], lower = [], upper = [], widths = []
  for (let n = 100; n <= maxN; n += 100) {
    let inside = 0
    for (let i = 0; i < n; i++) {
      const x = 2 * rng() - 1
      const y = 2 * rng() - 1
      if (x * x + y * y <= 1) inside++
    }
    const estimate = 4 * inside / n
    const margin = z * Math.sqrt(Math.PI * (4 - Math.PI) / n)
    sizes.push(n)
    estimates.push(estimate)
    lower.push(estimate - margin)
    upper.push(estimate + margin)
    widths.push(2 * margin)
  }
  return {sizes, estimates, lower, upper, widths}
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

// The Gauss circle estimate latticeCount(r) / r^2, with n = (2r + 1)^2, the
// number of points of the square [-r, r]^2 examined.
export function latticeEstimate(r) {
  const count = latticeCount(r)
  const estimate = count / (r * r)
  return {r, n: (2 * r + 1) ** 2, count, estimate, error: Math.abs(estimate - Math.PI)}
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
  const points = []
  for (let k = 0; k < counts.length; k++) {
    const sorted = errors[k].slice().sort((a, b) => a - b)
    let sumSquares = 0
    for (const e of sorted) sumSquares += e * e
    points.push({n: counts[k], error: Math.sqrt(sumSquares / runs), lo: quantile(sorted, 0.1), hi: quantile(sorted, 0.9)})
  }
  return points
}

// The Halton circle estimate's error at each n in counts.
export function haltonCircleErrors(counts) {
  const h = haltonPoints(counts[counts.length - 1])
  const points = []
  for (const n of counts) points.push({n, error: Math.abs(4 * h.insideCount[n] / n - Math.PI)})
  return points
}

// The Gauss circle estimate's error at every radius whose (2r + 1)^2 grid
// points fit in maxN. Every radius, not a sample: the error jumps about from
// one radius to the next, and a fit through a sample swings with the sample.
export function latticeErrors(maxN) {
  const points = []
  for (let r = 1; (2 * r + 1) ** 2 <= maxN; r++) {
    const e = latticeEstimate(r)
    points.push({n: e.n, error: e.error})
  }
  return points
}

// The least-squares line through (log10 n, log10 error) over n >= 100,
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
