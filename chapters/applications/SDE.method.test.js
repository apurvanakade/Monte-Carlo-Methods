/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Checks the Brownian-motion simulations against theory, with fixed seeds and
// the installed mathviz generator.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { wienerPaths, wienerEndpoints, gbmPaths } from './SDE.method.js'

const VM = loadVM()
const gaussianFor = seed => VM.sampling.gaussianRandom(VM.sampling.seededRandom(seed))

test('wienerPaths: starts at 0, on the time grid, deterministic', () => {
  const a = wienerPaths(2, 200, 5, gaussianFor(1))
  assert.equal(a.times.length, 201)
  assert.equal(a.times[0], 0)
  assert.ok(Math.abs(a.times[200] - 2) < 1e-12)
  assert.equal(a.paths.length, 5)
  for (const w of a.paths) {
    assert.equal(w.length, 201)
    assert.equal(w[0], 0)
  }
  assert.deepEqual(a, wienerPaths(2, 200, 5, gaussianFor(1)))
})

test('wienerPaths: W(T) has mean 0 and variance T; increments have variance dt', () => {
  const T = 2, N = 50, M = 4000
  const {paths} = wienerPaths(T, N, M, gaussianFor(5))
  const ends = [], incs = []
  for (const w of paths) {
    ends.push(w[N])
    incs.push(w[1] - w[0])
  }
  const e = VM.distributions.sampleStats(ends)
  // Var(W(T)) = T; the sample mean has se sqrt(T / M).
  assert.ok(Math.abs(e.mean) < 4 * Math.sqrt(T / M), `mean ${e.mean}`)
  assert.ok(Math.abs(e.variance / T - 1) < 4 * Math.sqrt(2 / M), `var ${e.variance}`)
  const inc = VM.distributions.sampleStats(incs)
  assert.ok(Math.abs(inc.variance / (T / N) - 1) < 4 * Math.sqrt(2 / M), `inc var ${inc.variance}`)
})

test('wienerEndpoints: W(T) ~ N(0, T) for T = 1 and 4', () => {
  // Smaller than the page (1000 paths of 100 steps) to stay fast; the sum of
  // independent N(0, dt) steps is exactly N(0, T) at any step count.
  const runs = wienerEndpoints([1, 4], 100, 3000, gaussianFor(2))
  assert.equal(runs.length, 2)
  for (const run of runs) {
    assert.equal(run.ends.length, 3000)
    const s = VM.distributions.sampleStats(run.ends)
    assert.ok(Math.abs(s.mean) < 4 * Math.sqrt(run.T / 3000), `T=${run.T} mean ${s.mean}`)
    assert.ok(Math.abs(s.variance / run.T - 1) < 4 * Math.sqrt(2 / 3000), `T=${run.T} var ${s.variance}`)
  }
})

test('gbmPaths: E[X(t)] = X0 exp(mu t) and the average is the path mean', () => {
  // mu = 1, sigma = 0.5 keeps the lognormal's variance modest:
  // Var(X(1)) = e^2 (e^0.25 - 1), so the mean of M paths has a known se.
  const mu = 1, sigma = 0.5, M = 5000
  const g = gbmPaths(mu, sigma, 1, 1, 20, M, gaussianFor(3))
  assert.equal(g.paths.length, M)
  assert.equal(g.paths[0][0], 1)
  const last = g.times.length - 1
  const se = Math.sqrt(Math.exp(2 * mu) * (Math.exp(sigma * sigma) - 1) / M)
  assert.ok(Math.abs(g.average[last] - Math.exp(mu)) < 4 * se, `avg ${g.average[last]}`)
  let sum = 0
  for (const x of g.paths) sum += x[10]
  assert.ok(Math.abs(g.average[10] - sum / M) < 1e-12)
  // Every path is positive.
  for (const x of g.paths) assert.ok(x[last] > 0)
})
