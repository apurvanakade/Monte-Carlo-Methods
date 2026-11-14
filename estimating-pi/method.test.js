/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Checks the pi simulations against theory, with the page's own seeds and the
// installed mathviz generator.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../scripts/load-vm.mjs'
import {
  dropPoints, circleEstimate, runningCircleEstimates, randomDirection, dropNeedles, needleCrossings, buffonEstimate,
  latticeCount, latticeEstimate, vanDerCorput, haltonPoints,
  checkpoints, randomCircleErrors, runningBuffonEstimates, randomBuffonErrors, haltonCircleErrors, latticeErrors, convergenceFit, convergenceOrder
} from './method.js'

const VM = loadVM()

test('dropPoints: counts are cumulative and points lie in the square', () => {
  const pts = dropPoints(VM.sampling.seededRandom(1), 1000)
  assert.equal(pts.insideCount.length, 1001)
  assert.equal(pts.insideCount[1000], pts.inside.filter(Boolean).length)
  for (let i = 0; i < 1000; i++) {
    assert.ok(Math.abs(pts.xs[i]) <= 1 && Math.abs(pts.ys[i]) <= 1)
    assert.equal(pts.inside[i], pts.xs[i] ** 2 + pts.ys[i] ** 2 <= 1)
  }
})

test('circleEstimate: pi hat is within 4 standard errors at N = 10000', () => {
  // The estimator is unbiased with this standard error, so a fixed seed landing
  // farther than 4 sigma from pi would mean the sampler or formula is wrong.
  const pts = dropPoints(VM.sampling.seededRandom(1), 10000)
  const s = circleEstimate(pts.insideCount[10000], 10000)
  assert.ok(s.error < 4 * s.stdError, `error ${s.error}, se ${s.stdError}`)
  assert.ok(Math.abs(s.stdError - 4 * Math.sqrt(Math.PI / 4 * (1 - Math.PI / 4) / 10000)) < 0.002)
})

test('runningCircleEstimates: final estimates have mean pi and SD sqrt(pi (4 - pi) / n)', () => {
  const counts = [100, 1000]
  const runs = runningCircleEstimates(VM.sampling.seededRandom(42), counts, 200)
  assert.equal(runs.length, 200)
  let sum = 0
  for (const run of runs) {
    assert.equal(run.length, counts.length)
    sum += run[1]
  }
  const mean = sum / 200
  let squares = 0
  for (const run of runs) squares += (run[1] - mean) ** 2
  const sd = Math.sqrt(squares / 199)
  const theorySd = Math.sqrt(Math.PI * (4 - Math.PI) / 1000)
  // The mean of 200 runs within 4 standard errors; the sample SD of 200 runs
  // has relative error about 1 / sqrt(2 * 199) = 5%, so within 4 of those.
  assert.ok(Math.abs(mean - Math.PI) < 4 * theorySd / Math.sqrt(200), `mean ${mean}`)
  assert.ok(Math.abs(sd / theorySd - 1) < 0.2, `sd ${sd}`)
})

test('runningBuffonEstimates: final estimates have mean near pi and the delta-method SD', () => {
  const runs = runningBuffonEstimates(VM.sampling.seededRandom(44), [100, 1000], 200, 1, 1)
  assert.equal(runs.length, 200)
  let sum = 0
  for (const run of runs) sum += run[1]
  const mean = sum / 200
  let squares = 0
  for (const run of runs) squares += (run[1] - mean) ** 2
  const sd = Math.sqrt(squares / 199)
  const p = 2 / Math.PI
  const theorySd = Math.PI * Math.sqrt((1 - p) / (1000 * p))
  // The bias at n = 1000 is about 0.002, well inside 4 standard errors of the
  // mean of 200 runs; the sample SD of 200 runs has relative error about 5%.
  assert.ok(Math.abs(mean - Math.PI) < 4 * theorySd / Math.sqrt(200), `mean ${mean}`)
  assert.ok(Math.abs(sd / theorySd - 1) < 0.2, `sd ${sd}`)
})

test('runningBuffonEstimates: null before the first crossing', () => {
  // A needle this short almost never crosses, so 2 drops usually give no estimate.
  const runs = runningBuffonEstimates(VM.sampling.seededRandom(1), [2], 50, 0.001, 1)
  let nulls = 0
  for (const run of runs) {
    if (run[0] === null) nulls++
  }
  assert.ok(nulls >= 45, `nulls ${nulls}`)
})

test('randomBuffonErrors: the RMS error falls like 1 / sqrt(n)', () => {
  const points = randomBuffonErrors(VM.sampling.seededRandom(45), [100, 1000], 200, 1, 1)
  const p = 2 / Math.PI
  const theory = Math.PI * Math.sqrt((1 - p) / (1000 * p))
  assert.ok(Math.abs(points[1].error / theory - 1) < 0.2, `rms ${points[1].error}`)
  const ratio = points[0].error / points[1].error
  assert.ok(ratio > Math.sqrt(10) * 0.7 && ratio < Math.sqrt(10) * 1.3, `ratio ${ratio}`)
})

test('randomDirection: unit vectors with a uniform angle', () => {
  // The fraction of directions in any quarter-turn sector should be 1/4.
  const rng = VM.sampling.seededRandom(1)
  const n = 4000
  let firstQuadrant = 0
  for (let i = 0; i < n; i++) {
    const [c, s] = randomDirection(rng)
    assert.ok(Math.abs(c * c + s * s - 1) < 1e-12)
    if (c > 0 && s > 0) firstQuadrant++
  }
  assert.ok(Math.abs(firstQuadrant / n - 0.25) < 4 * Math.sqrt(0.25 * 0.75 / n), `${firstQuadrant}`)
})

test('needleCrossings: crossing probability is 2 l / (pi t)', () => {
  const drops = dropNeedles(VM.sampling.seededRandom(1), 2000, 8, 6)
  const length = 0.8
  const c = needleCrossings(drops, length, 1)
  for (const k of c.crossings) assert.ok(k === 0 || k === 1)
  const p = c.crossingCount[2000] / 2000
  const expected = 2 * length / Math.PI
  const sd = Math.sqrt(expected * (1 - expected) / 2000)
  assert.ok(Math.abs(p - expected) < 4 * sd, `p ${p}, expected ${expected}`)
})

test('needleCrossings: the noodle has length l and crosses 2 l / (pi t) times on average (Barbier)', () => {
  const drops = dropNeedles(VM.sampling.seededRandom(1), 2000, 8, 6)
  const length = 0.8
  const c = needleCrossings(drops, length, 1, "noodle")
  let total = 0
  for (let j = 1; j < 4; j++) total += Math.hypot(c.xs[0][j] - c.xs[0][j - 1], c.ys[0][j] - c.ys[0][j - 1])
  assert.ok(Math.abs(total - length) < 1e-12, `length ${total}`)
  const mean = c.crossingCount[2000] / 2000
  const sd = Math.sqrt((c.crossingSquares[2000] / 2000 - mean * mean) / 2000)
  const expected = 2 * length / Math.PI
  assert.ok(Math.abs(mean - expected) < 4 * sd, `mean ${mean}, expected ${expected}`)
})

test('buffonEstimate: undefined before the first crossing, near pi after', () => {
  assert.equal(buffonEstimate(0, 0, 10, 0.8, 1).estimate, null)
  // For 0/1 crossings the standard error is the needle formula.
  const p = 0.5
  const needleSe = (2 * 0.8) * Math.sqrt((1 - p) / (100 * p ** 3))
  assert.ok(Math.abs(buffonEstimate(50, 50, 100, 0.8, 1).stdError - needleSe) < 1e-12)
  const drops = dropNeedles(VM.sampling.seededRandom(1), 2000, 8, 6)
  for (const shape of ["needle", "noodle"]) {
    const c = needleCrossings(drops, 0.8, 1, shape)
    const s = buffonEstimate(c.crossingCount[2000], c.crossingSquares[2000], 2000, 0.8, 1)
    assert.ok(s.error < 4 * s.stdError, `${shape}: error ${s.error}, se ${s.stdError}`)
  }
})

test('latticeCount matches known values, and count / r^2 tends to pi', () => {
  // OEIS A000328: points of Z^2 in the disk of radius r.
  assert.deepEqual([0, 1, 2, 3, 4, 5, 10].map(latticeCount), [1, 5, 13, 29, 49, 81, 317])
  // |count - pi r^2| <= 2 sqrt(2) pi r + 2 pi (Gauss): every unit square
  // centered on a counted point lies within distance sqrt(2)/2 of the circle.
  for (const r of [10, 40, 200]) {
    const e = latticeEstimate(r)
    assert.ok(e.error * r * r <= 2 * Math.SQRT2 * Math.PI * r + 2 * Math.PI, `r = ${r}: error ${e.error}`)
  }
})

test('haltonPoints: van der Corput digits, and an error far below Monte Carlo', () => {
  assert.deepEqual([1, 2, 3, 4].map(i => vanDerCorput(i, 2)), [0.5, 0.25, 0.75, 0.125])
  assert.ok(Math.abs(vanDerCorput(5, 3) - 7 / 9) < 1e-15)
  // At N = 10000 random points have standard error about 0.016; the Halton
  // estimate lands within a tenth of that.
  const h = haltonPoints(10000)
  const s = circleEstimate(h.insideCount[10000], 10000)
  assert.ok(s.error < 0.0016, `error ${s.error}`)
})

test('no sampler uses pi', () => {
  for (const f of [dropPoints, randomDirection, dropNeedles, needleCrossings, latticeCount, vanDerCorput, haltonPoints]) {
    assert.doesNotMatch(f.toString(), /Math\.PI/, f.name)
  }
})

test('convergenceFit recovers an exact power law', () => {
  const points = []
  for (const n of [100, 1000, 10000]) points.push({n, error: 3 * n ** -0.75})
  const fit = convergenceFit(points)
  assert.ok(Math.abs(fit.order - 0.75) < 1e-12)
  assert.ok(Math.abs(fit.intercept - Math.log10(3)) < 1e-12)
  assert.equal(convergenceFit([{n: 100, error: 1}]), null)
})

test('convergence orders: random 1/2 and Halton about 3/4 in N, Gauss about 3/2 in r', () => {
  // The page's figure: N (and r) up to 10^5, 40 random runs, seed 7. The
  // random RMS error is sqrt(pi (4 - pi) / N) exactly, so its fit is 1/2 up
  // to the noise of 40 runs. Halton's is near (log N)^2 / N, which over
  // 10^2..10^5 fits as about N^(-3/4), not N^(-1), at the 24 samples per
  // decade the page uses. The Gauss circle error is r^(-1) or better by
  // Gauss's own argument (r^(-1.37) by Huxley) and conjectured
  // r^(-3/2 + eps); its fit over 10^2..10^5 is about 1.44.
  const counts = checkpoints(1e5)
  assert.equal(counts[0], 10)
  assert.equal(counts[counts.length - 1], 1e5)
  const random = randomCircleErrors(VM.sampling.seededRandom(7), counts, 40)
  const last = random[random.length - 1]
  assert.ok(Math.abs(last.error / Math.sqrt(Math.PI * (4 - Math.PI) / 1e5) - 1) < 0.35, `rms ${last.error}`)
  assert.ok(last.lo <= last.error && last.error <= last.hi)
  const orders = [
    ["random", convergenceOrder(random), 0.5, 0.06],
    ["Gauss", convergenceOrder(latticeErrors(1e5)), 1.45, 0.08],
    ["Halton", convergenceOrder(haltonCircleErrors(checkpoints(1e5, 24))), 0.75, 0.08]
  ]
  for (const [label, order, want, tolerance] of orders) {
    assert.ok(Math.abs(order - want) <= tolerance, `${label}: order ${order}, expected about ${want}`)
  }
})
