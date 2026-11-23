/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Checks the integration methods against exact integrals and the chapter's
// formulas, with fixed seeds and the installed mathviz generator.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { integrands, hitMissSample, sampleMeanSample, sortedSample, sampleMeanEstimate, hitMissEstimate, midpointRule, midpointErrors, checkpoints,
  integrandErrors, gaussianCubeExact, gaussianCubeSd, gaussianCubeRandomErrors, gaussianCubeGridErrors, primes,
  vanDerCorput, gaussianCubeHaltonErrors, convergenceFit } from './method.js'

const VM = loadVM()

test('integrands: each stated integral matches a fine midpoint rule, and 0 <= f <= max', () => {
  for (const key of Object.keys(integrands)) {
    const g = integrands[key]
    // The midpoint rule's error is O(h^2) for the smooth integrands and
    // O(h^(3/2)) for the quarter circle's square-root end: under 1e-5 at 20,000 cells.
    assert.ok(Math.abs(midpointRule(g.f, g.a, g.b, 20000) - g.exact) < 1e-5, key)
    for (let i = 0; i <= 100; i++) {
      const y = g.f(g.a + (g.b - g.a) * i / 100)
      assert.ok(y >= 0 && y <= g.max + 1e-12, key)
    }
  }
})

test('hitMissSample: the points fill the box, the hit counts match, and a taller box stretches the same points', () => {
  const s = hitMissSample(VM.sampling.seededRandom(3), integrands.circle, 4, 500)
  let hits = 0
  for (let i = 0; i < 500; i++) {
    assert.ok(s.xs[i] >= 0 && s.xs[i] < 1 && s.ys[i] >= 0 && s.ys[i] < 4)
    assert.equal(s.under[i], s.ys[i] <= integrands.circle.f(s.xs[i]))
    if (s.under[i]) hits++
  }
  assert.equal(s.hits[500], hits)
  assert.deepEqual(hitMissSample(VM.sampling.seededRandom(3), integrands.circle, 4, 500), s)
  // With the same seed and a box twice as tall, each x is unchanged and each
  // y doubles, so no new point can fall under the curve.
  const tall = hitMissSample(VM.sampling.seededRandom(3), integrands.circle, 8, 500)
  for (let i = 0; i < 500; i++) {
    assert.equal(tall.xs[i], s.xs[i])
    assert.equal(tall.ys[i], 2 * s.ys[i])
  }
  assert.ok(tall.hits[500] <= s.hits[500])
})

test('sampleMeanSample: running sums match the points, and equal seeds agree', () => {
  const s = sampleMeanSample(VM.sampling.seededRandom(3), integrands.circle, 500)
  let sum = 0, sum2 = 0
  for (let i = 0; i < 500; i++) {
    assert.ok(s.xs[i] >= 0 && s.xs[i] < 1)
    assert.equal(s.fs[i], integrands.circle.f(s.xs[i]))
    sum += s.fs[i]
    sum2 += s.fs[i] * s.fs[i]
  }
  assert.ok(Math.abs(s.sumF[500] - sum) < 1e-9)
  assert.ok(Math.abs(s.sumF2[500] - sum2) < 1e-9)
  assert.deepEqual(sampleMeanSample(VM.sampling.seededRandom(3), integrands.circle, 500), s)
})

test('sortedSample: the first n points in increasing order, each with its own height, so the bars sum to the estimate', () => {
  const g = integrands.sin
  const s = sampleMeanSample(VM.sampling.seededRandom(3), g, 500)
  const sorted = sortedSample(s, 200)
  assert.equal(sorted.xs.length, 200)
  let sum = 0
  for (let i = 0; i < 200; i++) {
    if (i > 0) assert.ok(sorted.xs[i - 1] <= sorted.xs[i])
    assert.equal(sorted.fs[i], g.f(sorted.xs[i]))
    sum += sorted.fs[i]
  }
  // Sorting only reorders the first 200 heights, so their sum is unchanged:
  // bars of width (b - a) / 200 have total area (b - a) * mean, the estimate.
  assert.ok(Math.abs(sum - s.sumF[200]) < 1e-9)
  const barArea = (g.b - g.a) / 200 * sum
  assert.ok(Math.abs(barArea - sampleMeanEstimate(s.sumF[200], s.sumF2[200], 200, g.b - g.a).estimate) < 1e-9)
})

test('sampleMeanEstimate: sin on [0, pi] is within 4 standard errors of 2, and the estimated SE matches theory', () => {
  // Unbiased with variance pi^2 Var(sin X) / n, and Var(sin X) = 1/2 - 4/pi^2
  // for X uniform on [0, pi].
  const n = 20000
  const s = sampleMeanSample(VM.sampling.seededRandom(0), integrands.sin, n)
  const est = sampleMeanEstimate(s.sumF[n], s.sumF2[n], n, Math.PI)
  const se = Math.PI * Math.sqrt(0.5 - 4 / (Math.PI * Math.PI)) / Math.sqrt(n)
  assert.ok(Math.abs(est.estimate - 2) < 4 * se, `est ${est.estimate}, se ${se}`)
  // The sample standard deviation of 20,000 values is within a few percent.
  assert.ok(Math.abs(est.stdError / se - 1) < 0.05, `stdError ${est.stdError}, se ${se}`)
  // A constant has no spread; one point has no standard error.
  assert.equal(sampleMeanEstimate(12, 48, 3, 2).stdError, 0)
  assert.equal(sampleMeanEstimate(4, 16, 1, 2).stdError, null)
})

test('hitMissEstimate: the quarter circle is within 4 standard errors of pi, and a taller box has a larger standard error', () => {
  // The hits are Bernoulli(pi/4) and the box has area 4, so the variance is
  // 16 (pi/4)(1 - pi/4) / n = pi (4 - pi) / n.
  const n = 20000
  const s = hitMissSample(VM.sampling.seededRandom(1), integrands.circle, 4, n)
  const est = hitMissEstimate(s.hits[n], n, 4)
  const se = Math.sqrt(Math.PI * (4 - Math.PI) / n)
  assert.ok(Math.abs(est.estimate - Math.PI) < 4 * se, `est ${est.estimate}, se ${se}`)
  assert.ok(Math.abs(est.stdError / se - 1) < 0.05)
  // A box three times as tall, of area 12: the variance is pi (12 - pi) / n,
  // so the standard error grows with the height of the box.
  const tall = hitMissSample(VM.sampling.seededRandom(1), integrands.circle, 12, n)
  const tallEst = hitMissEstimate(tall.hits[n], n, 12)
  const tallSe = Math.sqrt(Math.PI * (12 - Math.PI) / n)
  assert.ok(Math.abs(tallEst.estimate - Math.PI) < 4 * tallSe, `est ${tallEst.estimate}, se ${tallSe}`)
  assert.ok(Math.abs(tallEst.stdError / tallSe - 1) < 0.05)
  assert.ok(tallEst.stdError > est.stdError)
})

test('midpointRule: exact on linear functions, and its error on sin is (h^2 / 24)(f\'(a) - f\'(b))', () => {
  assert.ok(Math.abs(midpointRule(x => 3 * x + 1, 0, 2, 7) - 8) < 1e-12)
  // For sin on [0, pi]: M_N - 2 ≈ pi^2 / (12 N^2).
  const errors = midpointErrors(Math.sin, 0, Math.PI, 2, [10, 100, 1000])
  for (const p of errors) {
    const predicted = Math.PI * Math.PI / (12 * p.n * p.n)
    assert.ok(Math.abs(p.error / predicted - 1) < 0.01, `n ${p.n}, error ${p.error}`)
  }
})

test('checkpoints: from 10 to max, increasing', () => {
  const counts = checkpoints(10000)
  assert.equal(counts[0], 10)
  assert.equal(counts[counts.length - 1], 10000)
  for (let i = 1; i < counts.length; i++) assert.ok(counts[i] > counts[i - 1])
})

test('integrandErrors: both estimators fall like N^(-1/2), and hit-or-miss is about 1.84 times worse', () => {
  const counts = checkpoints(10000)
  const e = integrandErrors(VM.sampling.seededRandom(21), integrands.circle, counts, 200)
  // N Var is pi (4 - pi) for hit-or-miss and 32/3 - pi^2 for the sample mean.
  const hitSd = Math.sqrt(Math.PI * (4 - Math.PI)), meanSd = Math.sqrt(32 / 3 - Math.PI * Math.PI)
  // The RMS of 200 runs estimates the standard error to about 5% (1 / sqrt(2 * 200)).
  for (const p of e.sampleMean) assert.ok(Math.abs(p.error * Math.sqrt(p.n) / meanSd - 1) < 0.25, `sample mean n ${p.n}`)
  for (const p of e.hitMiss) assert.ok(Math.abs(p.error * Math.sqrt(p.n) / hitSd - 1) < 0.25, `hit or miss n ${p.n}`)
  assert.ok(Math.abs(convergenceFit(e.sampleMean).order - 0.5) < 0.05)
  assert.ok(Math.abs(convergenceFit(e.hitMiss).order - 0.5) < 0.05)
})

test('gaussianCubeExact, gaussianCubeSd: match the one-dimensional integrals', () => {
  // int_0^1 e^{-t^2} dt = 0.7468241328... and int_0^1 e^{-2 t^2} dt = 0.5981440066...
  assert.ok(Math.abs(gaussianCubeExact(1) - 0.7468241328) < 1e-6)
  assert.ok(Math.abs(gaussianCubeExact(3) - Math.pow(0.7468241328, 3)) < 1e-6)
  assert.ok(Math.abs(gaussianCubeSd(1) - Math.sqrt(0.5981440066 - 0.7468241328 ** 2)) < 1e-6)
  // The relative variance is rho^d - 1 with rho = b / a^2 = 1.07243...
  const rho = 0.5981440066 / 0.7468241328 ** 2
  assert.ok(Math.abs((gaussianCubeSd(10) / gaussianCubeExact(10)) ** 2 - (Math.pow(rho, 10) - 1)) < 1e-6)
})

test('gaussianCubeRandomErrors: the RMS relative error matches sd / (mean sqrt(N)) in each dimension', () => {
  const counts = checkpoints(10000)
  for (const d of [1, 4, 10]) {
    const errors = gaussianCubeRandomErrors(VM.sampling.seededRandom(31), d, counts, 40)
    const relSd = gaussianCubeSd(d) / gaussianCubeExact(d)
    // The RMS of 40 runs estimates the standard error to about 11%
    // (1 / sqrt(2 * 40)); allow 4 of those.
    for (const p of errors) assert.ok(Math.abs(p.error * Math.sqrt(p.n) / relSd - 1) < 0.45, `d ${d}, n ${p.n}`)
  }
})

test('gaussianCubeGridErrors: N = m^d points, and the error falls like N^(-2/d)', () => {
  for (const d of [1, 2, 4]) {
    const points = gaussianCubeGridErrors(d, 1e6)
    for (const p of points) assert.equal(p.n, Math.pow(p.m, d))
    // The midpoint rule is second order per axis, so the order in N is 2/d.
    assert.ok(Math.abs(convergenceFit(points).order - 2 / d) < 0.05, `d ${d}`)
  }
  // In ten dimensions only m = 1, 2, 3 fit under a million points.
  assert.equal(gaussianCubeGridErrors(10, 1e6).length, 3)
})

test('vanDerCorput: mirrors the digits, and the first 2^k - 1 terms are the multiples of 2^-k', () => {
  const first = []
  for (let i = 1; i <= 8; i++) first.push(vanDerCorput(i, 2))
  assert.deepEqual(first, [1 / 2, 1 / 4, 3 / 4, 1 / 8, 5 / 8, 3 / 8, 7 / 8, 1 / 16])
  assert.ok(Math.abs(vanDerCorput(5, 3) - (2 / 3 + 1 / 9)) < 1e-15)
  const terms = []
  for (let i = 0; i < 64; i++) terms.push(vanDerCorput(i, 2))
  terms.sort((a, b) => a - b)
  for (let j = 0; j < 64; j++) assert.equal(terms[j], j / 64)
  assert.equal(primes.length, 12)
})

test('gaussianCubeHaltonErrors: Halton points beat the Monte Carlo standard error at N = 10^5', () => {
  const counts = checkpoints(100000)
  for (const d of [1, 5, 10]) {
    const errors = gaussianCubeHaltonErrors(d, counts)
    const last = errors[errors.length - 1]
    const monteCarlo = gaussianCubeSd(d) / gaussianCubeExact(d) / Math.sqrt(last.n)
    assert.ok(last.error < monteCarlo / 3, `d ${d}, error ${last.error}, MC ${monteCarlo}`)
    // The fitted order is near 1, far from Monte Carlo's 1/2.
    assert.ok(convergenceFit(errors).order > 0.75, `d ${d}`)
  }
})

test('convergenceFit: recovers the order and constant of an exact power law', () => {
  const points = []
  for (const n of [10, 100, 1000, 10000]) points.push({n, error: 3 * Math.pow(n, -1.5)})
  const fit = convergenceFit(points)
  assert.ok(Math.abs(fit.order - 1.5) < 1e-9)
  assert.ok(Math.abs(10 ** fit.intercept - 3) < 1e-9)
  assert.equal(convergenceFit([{n: 1000, error: 0.1}]), null)
})
