/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Checks the particle filter against its model, with the page's own seed and
// the installed mathviz generator.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { pfPropagate, runParticleFilter, pfEllipse } from './particle_filters.method.js'

const VM = loadVM()
const model = {dt: 1, T: 30, nParticles: 500, sigmaA: 0.5, sigmaR: 1.0, start: [0, 0, 1, 0.5], initialVariances: [2, 2, 1, 1]}

test('pfPropagate: moments of the random-acceleration step', () => {
  // x' = x + v dt + a dt^2/2 with a ~ N(0, sigma_a^2): mean x + v dt, and
  // variance sigma_a^2 dt^4/4 for the position and sigma_a^2 dt^2 for the velocity.
  const gaussian = VM.sampling.gaussianRandom(VM.sampling.seededRandom(7))
  const n = 40000
  const px = [], vx = []
  for (let i = 0; i < n; i++) {
    const s = pfPropagate([1, 2, 3, 4], 2, 0.5, gaussian)
    px.push(s[0])
    vx.push(s[2])
  }
  const a = VM.distributions.sampleStats(px), b = VM.distributions.sampleStats(vx)
  const varX = 0.25 * 16 / 4, varV = 0.25 * 4
  assert.ok(Math.abs(a.mean - 7) < 4 * Math.sqrt(varX / n), `mean ${a.mean}`)
  assert.ok(Math.abs(b.mean - 3) < 4 * Math.sqrt(varV / n), `mean ${b.mean}`)
  assert.ok(Math.abs(a.variance - varX) < 0.05 * varX, `var ${a.variance}`)
  assert.ok(Math.abs(b.variance - varV) < 0.05 * varV, `var ${b.variance}`)
})

test('runParticleFilter: shapes, invariants and determinism', () => {
  const r = runParticleFilter(VM.sampling.seededRandom(42), model)
  assert.equal(r.truth.length, model.T + 1)
  assert.equal(r.observations.length, model.T)
  assert.equal(r.estimates.length, model.T)
  assert.equal(r.errors.length, model.T)
  for (let t = 0; t < model.T; t++) {
    // The effective sample size of normalized weights lies in [1, N].
    assert.ok(r.ess[t] >= 1 - 1e-9 && r.ess[t] <= model.nParticles + 1e-9)
    // A covariance matrix has nonnegative variances and |cxy|^2 <= cxx cyy.
    const [cxx, cxy, cyy] = r.positionCovs[t]
    assert.ok(cxx >= 0 && cyy >= 0 && cxy * cxy <= cxx * cyy * (1 + 1e-9))
  }
  // Resampling happens exactly at the steps where ESS < N/2.
  const expected = []
  for (let t = 0; t < model.T; t++) {
    if (r.ess[t] < model.nParticles / 2) expected.push(t)
  }
  assert.deepEqual(r.resampledSteps, expected)
  const again = runParticleFilter(VM.sampling.seededRandom(42), model)
  assert.deepEqual(again.errors, r.errors)
})

test('runParticleFilter: tracks the truth better than the raw observations', () => {
  // Filtering combines the model with the data, so with sigma_r = 1 the mean
  // position error must beat the raw observation error, whose expectation is
  // sigma_r sqrt(pi/2) = 1.25, and stay of that order at worst.
  const r = runParticleFilter(VM.sampling.seededRandom(42), model)
  const meanError = VM.distributions.sampleStats(r.errors).mean
  let raw = 0
  for (let t = 0; t < model.T; t++) {
    raw += Math.hypot(r.observations[t][0] - r.truth[t + 1][0], r.observations[t][1] - r.truth[t + 1][1])
  }
  raw /= model.T
  assert.ok(meanError < raw, `filter ${meanError}, raw ${raw}`)
  assert.ok(meanError < 1.5, `filter ${meanError}`)
})

test('pfEllipse: closed-form axes and center', () => {
  // For cov = diag(4, 1) the 95% ellipse has semi-axes sqrt(chi2_{0.95}(2) * var):
  // 2 sqrt(5.991) along x and sqrt(5.991) along y.
  const e = pfEllipse([3, -1], [4, 0, 1])
  assert.equal(e.xs.length, 61)
  const q = VM.distributions.chiSquaredQuantile(0.95, 2)
  assert.ok(Math.abs(q - 5.991) < 0.01)
  let maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i < 61; i++) {
    maxX = Math.max(maxX, e.xs[i] - 3)
    maxY = Math.max(maxY, e.ys[i] + 1)
  }
  assert.ok(Math.abs(maxX - 2 * Math.sqrt(q)) < 1e-6)
  assert.ok(Math.abs(maxY - Math.sqrt(q)) < 1e-6)
})
