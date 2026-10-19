/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Checks the variance-reduction methods against exact values and queueing
// theory, with the page's own seeds and the installed mathviz generator.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../scripts/load-vm.mjs'
import { runningAverage, importanceTailEstimate, controlVariateStudy, antitheticStudy, mm1WaitingTimes, drawMany, crnStudy, crnDemoStudy } from './method.js'

const VM = loadVM()

test('runningAverage: out[i] is the mean of the first i + 1 values', () => {
  assert.deepEqual(runningAverage([2, 4, 6, 8]), [2, 3, 4, 5])
})

test('importanceTailEstimate: both estimators hit P(X > 2) and IS has far smaller variance', () => {
  const r = importanceTailEstimate(VM.sampling.seededRandom(42), 4000)
  assert.ok(Math.abs(r.trueValue - 0.02275013) < 1e-6)
  // IS standard error is the sample sd / sqrt(N); crude is sqrt(l (1 - l) / N).
  const isSe = r.isStats.sd / Math.sqrt(r.N)
  assert.ok(Math.abs(r.isStats.mean - r.trueValue) < 4 * isSe, `IS ${r.isStats.mean}`)
  const crudeSe = Math.sqrt(r.trueValue * (1 - r.trueValue) / r.N)
  assert.ok(Math.abs(r.crudeStats.mean - r.trueValue) < 4 * crudeSe, `crude ${r.crudeStats.mean}`)
  // Theory: the weights phi(y) / q(y) are bounded
  // by phi(2) = 0.054, so the sample variance is at least 50 times smaller than crude's.
  assert.ok(r.crudeStats.variance / r.isStats.variance > 50)
  assert.equal(r.weighted.length, 4000)
})

test('controlVariateStudy: every beta is unbiased, beta* minimizes variance', () => {
  const r = controlVariateStudy(VM.sampling.seededRandom(42), 1000, 100)
  assert.ok(Math.abs(r.trueValue - 0.2642411) < 1e-6)
  // Each estimator has expectation 1 - 2/e (h0 is exact), with its own standard error.
  for (const point of r.tested) {
    assert.ok(Math.abs(point.estimate - r.trueValue) < 4 * Math.sqrt(r.standard.variance), `beta ${point.beta}`)
  }
  for (let i = 1; i < r.tested.length; i++) assert.ok(r.tested[i].beta >= r.tested[i - 1].beta)
  // beta* = Cov(x e^-x, x) / Var(x) = 12 Cov, about 0.39 for the exact moments.
  assert.ok(Math.abs(r.betaEst - 0.39) < 0.1, `beta* ${r.betaEst}`)
  // The variance is a convex quadratic in beta, so the curve minimum is near beta*
  // and below the standard variance.
  let best = r.curve[0]
  for (const p of r.curve) if (p.variance < best.variance) best = p
  assert.ok(Math.abs(best.beta - r.betaEst) < 0.05)
  assert.ok(best.variance < r.standard.variance / 5)
  assert.equal(r.runningControl.length, 1000)
})

test('antitheticStudy: both estimate pi/4, antithetic variance is smaller', () => {
  const r = antitheticStudy(VM.sampling.seededRandom(42), 200)
  assert.ok(Math.abs(r.standard.estimate - Math.PI / 4) < 4 * Math.sqrt(r.standard.variance))
  assert.ok(Math.abs(r.antithetic.estimate - Math.PI / 4) < 4 * Math.sqrt(r.antithetic.variance))
  // f is monotone, so pairs are negatively correlated; the reduction is large for this f.
  assert.ok(r.antithetic.variance < r.standard.variance / 5)
  assert.equal(r.runningStandard.length, 100)
  assert.equal(r.runningAntithetic.length, 100)
})

test('mm1WaitingTimes: Lindley recursion on a hand-worked example', () => {
  // Arrivals at 1, 2, 4; service times 1.5, 1, 1 (rate 1). Customer 1 waits 0
  // and leaves at 2.5; customer 2 waits 0.5 and leaves at 3.5; customer 3
  // arrives at 4 after that, so waits 0.
  assert.deepEqual(mm1WaitingTimes([1, 1, 2], [1.5, 1, 1], 1), [0, 0.5, 0])
  // Doubling the rate halves the service times, so waits cannot increase.
  const slow = mm1WaitingTimes([1, 1, 2], [1.5, 1, 1], 1)
  const fast = mm1WaitingTimes([1, 1, 2], [1.5, 1, 1], 2)
  for (let i = 0; i < 3; i++) assert.ok(fast[i] <= slow[i])
})

test('mm1WaitingTimes: long-run mean wait matches lambda / (mu (mu - lambda))', () => {
  // Stationary M/M/1 theory with lambda = 1, mu = 2 gives 0.5. The queue
  // starts empty and successive waits correlate, so allow a loose 20% band
  // at 50000 customers.
  const draw = VM.sampling.exponentialRandom(VM.sampling.seededRandom(3), 1)
  const waits = mm1WaitingTimes(drawMany(draw, 50000), drawMany(draw, 50000), 2)
  const m = VM.distributions.sampleStats(waits).mean
  assert.ok(Math.abs(m - 0.5) < 0.1, `mean wait ${m}`)
})

test('crnStudy: common random numbers cut variance and both centre on the theoretical difference', () => {
  const r = crnStudy(VM.sampling.seededRandom(42), 1000, 100, 1, 1.5, 2)
  assert.ok(Math.abs(r.theory[0] - 4 / 3) < 1e-12 && Math.abs(r.theory[1] - 0.5) < 1e-12)
  // 1000 customers per run starting empty biases the mean slightly, so allow
  // 4 standard errors of the 100-replication mean plus 0.05 of bias.
  const diff = r.theory[0] - r.theory[1]
  assert.ok(Math.abs(r.independent.mean - diff) < 4 * r.independent.sd / 10 + 0.05)
  assert.ok(Math.abs(r.crn.mean - diff) < 4 * r.crn.sd / 10 + 0.05)
  assert.ok(r.independent.variance / r.crn.variance > 1.5, 'CRN should reduce variance')
})

test('crnDemoStudy: waits are positively correlated and deterministic', () => {
  const d = crnDemoStudy(VM.sampling.seededRandom(7), 1.5, 2)
  assert.equal(d.wait1.length, 50)
  assert.equal(d.demo1.length, 100)
  // Same arrivals and requirements, faster server: waits cannot be larger.
  for (let i = 0; i < 100; i++) assert.ok(d.demo2[i] <= d.demo1[i] + 1e-12)
  assert.ok(d.correlation > 0.5 && d.correlation <= 1, `rho ${d.correlation}`)
  // The fit is least squares on {x, y} points (an earlier version passed [x, y] pairs and got NaN).
  assert.ok(d.fit.slope > 0 && Number.isFinite(d.fit.intercept), JSON.stringify(d.fit))
  assert.deepEqual(d, crnDemoStudy(VM.sampling.seededRandom(7), 1.5, 2))
})
