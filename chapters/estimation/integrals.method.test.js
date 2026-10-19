/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Checks the integration methods against exact integrals, with the page's own
// seed and the installed mathviz generator.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { monteCarloIntegrate, logSampleSizes, integrandStudy, gaussianCubeExact, gaussianCubeEstimate, dimensionStudy } from './integrals.method.js'

const VM = loadVM()

test('logSampleSizes: ends at 10^lo and 10^hi, increasing', () => {
  const sizes = logSampleSizes(20, 2, 5)
  assert.equal(sizes.length, 20)
  assert.equal(sizes[0], 100)
  assert.equal(sizes[19], 100000)
  for (let i = 1; i < 20; i++) assert.ok(sizes[i] > sizes[i - 1])
})

test('monteCarloIntegrate: sin on [0, pi] is within 4 standard errors of 2', () => {
  // The estimator is unbiased with variance (b - a)^2 Var(f(X)) / n, and
  // Var(sin X) = 1/2 - 4/pi^2 for X uniform on [0, pi].
  const n = 20000
  const se = Math.PI * Math.sqrt(0.5 - 4 / (Math.PI * Math.PI)) / Math.sqrt(n)
  const est = monteCarloIntegrate(Math.sin, 0, Math.PI, n, VM.sampling.seededRandom(0))
  assert.ok(Math.abs(est - 2) < 4 * se, `est ${est}, se ${se}`)
})

test('monteCarloIntegrate: constants integrate exactly and equal seeds agree', () => {
  assert.ok(Math.abs(monteCarloIntegrate(() => 3, 1, 5, 10, VM.sampling.seededRandom(1)) - 12) < 1e-12)
  const a = monteCarloIntegrate(Math.exp, 0, 1, 100, VM.sampling.seededRandom(5))
  const b = monteCarloIntegrate(Math.exp, 0, 1, 100, VM.sampling.seededRandom(5))
  assert.equal(a, b)
})

test('integrandStudy: oscillatory estimator has a larger spread than the smooth one', () => {
  const fns = [
    {f: x => Math.sin(x), trueValue: 2},
    {f: x => 25 * Math.sin(25 * x), trueValue: 2}
  ]
  const sizes = logSampleSizes(20, 2, 5)
  const r = integrandStudy(VM.sampling.seededRandom(0), fns, 0, Math.PI, sizes, 10000, 25)
  assert.equal(r.length, 2)
  assert.equal(r[0].estimates.length, 20)
  for (let i = 0; i < 20; i++) {
    assert.equal(r[0].errors[i], Math.abs(r[0].estimates[i] - 2))
  }
  // Theory: sd of the estimator at n = 10000 is pi sd(f(X)) / 100, which is
  // about 0.0151 for sin and about 0.555 for 25 sin(25x) (variance about
  // 25^2/2). The mean of 25 runs has sd/5, so it must be within 4 of those of 2.
  const sdSmooth = Math.PI * Math.sqrt(0.5 - 4 / (Math.PI * Math.PI)) / 100
  const sdOsc = Math.PI * 25 * Math.sqrt(0.5) / 100
  assert.ok(Math.abs(r[0].repeat.mean - 2) < 4 * sdSmooth / 5)
  assert.ok(Math.abs(r[1].repeat.mean - 2) < 4 * sdOsc / 5)
  assert.ok(r[1].repeat.sd > 10 * r[0].repeat.sd)
  // Sample sd of 25 runs is within 50% of the theoretical one.
  assert.ok(Math.abs(r[0].repeat.sd / sdSmooth - 1) < 0.5)
  assert.ok(Math.abs(r[1].repeat.sd / sdOsc - 1) < 0.5)
})

test('gaussianCubeExact: matches the one-dimensional integral and powers', () => {
  // int_0^1 e^{-t^2} dt = 0.7468241328...
  assert.ok(Math.abs(gaussianCubeExact(1) - 0.7468241328) < 1e-6)
  assert.ok(Math.abs(gaussianCubeExact(3) - Math.pow(0.7468241328, 3)) < 1e-6)
})

test('gaussianCubeEstimate: within 4 standard errors of the exact value in each dimension', () => {
  const rng = VM.sampling.seededRandom(0)
  const n = 20000
  for (let d = 1; d <= 5; d++) {
    // The standard error is sd(exp(-|X|^2)) / sqrt(n); bounded here by
    // 0.3 / sqrt(n), since the integrand lies in [e^-d, 1] with sd < 0.3.
    const est = gaussianCubeEstimate(rng, d, n)
    assert.ok(Math.abs(est - gaussianCubeExact(d)) < 4 * 0.3 / Math.sqrt(n), `d ${d}, est ${est}`)
  }
})

test('dimensionStudy: spread falls like 1/sqrt(n) and is deterministic', () => {
  const sizes = logSampleSizes(15, 2, 3.5)
  const r = dimensionStudy(VM.sampling.seededRandom(0), 5, sizes, 30)
  const again = dimensionStudy(VM.sampling.seededRandom(0), 5, sizes, 30)
  assert.deepEqual(r, again)
  assert.equal(r.length, 5)
  for (const row of r) {
    assert.equal(row.sds.length, 15)
    // From n = 100 to n = 3162 the sd should drop by about sqrt(31.6) = 5.6;
    // with 30 runs per point the ratio is accurate to ~25% each, so allow 3 to 12.
    const ratio = row.sds[0] / row.sds[14]
    assert.ok(ratio > 3 && ratio < 12, `d ${row.d}, ratio ${ratio}`)
  }
})
