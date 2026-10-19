/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Checks the bootstrap simulations against theory, with fixed seeds and the
// installed mathviz generator.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { normalSample, bootstrap, sampleMean, bootstrapMeans, bootstrapMeansIndependent, fractionAbove, tailBootstrap } from './bootstrap.method.js'

const VM = loadVM()

test('normalSample: moments match N(mean, sd^2)', () => {
  const gaussian = VM.sampling.gaussianRandom(VM.sampling.seededRandom(1))
  const x = normalSample(20000, 3, 2, gaussian)
  const s = VM.distributions.sampleStats(x)
  // Mean has standard error 2 / sqrt(20000); sd has se about 2 / sqrt(2 * 20000).
  assert.ok(Math.abs(s.mean - 3) < 4 * 2 / Math.sqrt(20000), `mean ${s.mean}`)
  assert.ok(Math.abs(s.sd - 2) < 4 * 2 / Math.sqrt(40000), `sd ${s.sd}`)
})

test('bootstrap: resamples come from the data and the output is deterministic', () => {
  const data = [1, 2, 3, 4, 5]
  const a = bootstrap(data, v => v, 50, VM.sampling.seededRandom(7))
  for (const resample of a) {
    assert.equal(resample.length, 5)
    for (const v of resample) assert.ok(data.includes(v))
  }
  const b = bootstrap(data, v => v, 50, VM.sampling.seededRandom(7))
  assert.deepEqual(a, b)
})

test('bootstrapMeans: bootstrap mean is centered at xbar with sd s / sqrt(n)', () => {
  // Conditional on the sample, the bootstrap mean has mean xbar and variance
  // (n - 1) s^2 / n^2 (n-denominator variance / n), so sd is about s / sqrt(n).
  const runs = bootstrapMeans([5, 10, 25, 50], 2000, 42)
  assert.equal(runs.length, 4)
  for (const run of runs) {
    assert.equal(run.boot.length, 2000)
    const b = VM.distributions.sampleStats(run.boot)
    assert.ok(Math.abs(b.mean - run.center) < 4 * b.sd / Math.sqrt(2000), `n=${run.n} mean ${b.mean} vs ${run.center}`)
    const expectedSd = run.se * Math.sqrt((run.n - 1) / run.n)
    assert.ok(Math.abs(b.sd / expectedSd - 1) < 0.1, `n=${run.n} sd ${b.sd} vs ${expectedSd}`)
  }
})

test('bootstrapMeansIndependent: per-size seeds, deterministic', () => {
  const a = bootstrapMeansIndependent([3, 20, 50], 500, 42)
  const b = bootstrapMeansIndependent([3, 20, 50], 500, 42)
  assert.deepEqual(a, b)
  for (const run of a) {
    assert.equal(run.sample.length, run.n)
    assert.equal(run.boot.length, 500)
  }
})

test('fractionAbove and sampleMean on a small example', () => {
  assert.equal(fractionAbove([1, 5, 9, 10], 4), 0.75)
  assert.equal(sampleMean([1, 2, 3]), 2)
})

test('tailBootstrap: both estimates of P(X > 8) are near the truth', () => {
  const t = tailBootstrap({n: 25, mu: 5, sigma: 1.5, threshold: 8, B: 2000})
  // P(Z > 2) for N(5, 1.5^2) and threshold 8.
  assert.ok(Math.abs(t.trueProb - 0.02275) < 1e-4, `true ${t.trueProb}`)
  assert.equal(t.data.length, 25)
  assert.equal(t.nonparametricSample.length, 25)
  assert.equal(t.parametricSample.length, 25)
  // The parametric bootstrap mean of the plug-in tail probability is the
  // fitted-normal tail, which with n = 25 is within a few percentage points
  // of the truth; the non-parametric one is a multiple of 1/25 of the data.
  assert.ok(Math.abs(t.parametricMean - t.trueProb) < 0.05, `parametric ${t.parametricMean}`)
  assert.ok(Math.abs(t.nonparametricMean - t.trueProb) < 0.05, `nonparametric ${t.nonparametricMean}`)
  // Non-parametric resamples reuse the data's values.
  for (const v of t.nonparametricSample) assert.ok(t.data.includes(v))
})
