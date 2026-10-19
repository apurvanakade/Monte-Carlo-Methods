/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Checks the Gibbs-sampling methods against theory, with the page's own seeds
// and the installed mathviz generator.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import {
  jointExponentialDensity, bivariateNormalDensity, truncatedExponential, densityGrid,
  gibbsJointExponential, chainSummary, normalContours, staircasePath, gibbsAcfTheory
} from './gibbs_2d.method.js'

const VM = loadVM()

test('truncatedExponential: inverse transform maps [0,1) onto [0,D] with the right cdf', () => {
  // U = 0 -> 0, U -> 1 gives D, and the cdf of the draw at t is
  // (1 - e^{-rate t}) / (1 - e^{-rate D}); check at t = 1 by inverting.
  const rate = 1.7, D = 3
  assert.equal(Math.abs(truncatedExponential(rate, D, 0)), 0)
  assert.ok(Math.abs(truncatedExponential(rate, D, 1 - 1e-15) - D) < 1e-6)
  const u = (1 - Math.exp(-rate * 1)) / (1 - Math.exp(-rate * D))
  assert.ok(Math.abs(truncatedExponential(rate, D, u) - 1) < 1e-12)
  // Rate 0 is uniform on [0, D].
  assert.equal(truncatedExponential(0, D, 0.25), 0.75)
  // Sample mean vs. the truncated-exponential mean 1/r - D e^{-rD} / (1 - e^{-rD}).
  const rng = VM.sampling.seededRandom(4)
  const n = 20000
  let sum = 0, sumSq = 0
  for (let i = 0; i < n; i++) {
    const v = truncatedExponential(rate, D, rng())
    assert.ok(v >= 0 && v <= D)
    sum += v
    sumSq += v * v
  }
  const mean = 1 / rate - D * Math.exp(-rate * D) / (1 - Math.exp(-rate * D))
  const mu = sum / n
  const sd = Math.sqrt(sumSq / n - mu * mu)
  assert.ok(Math.abs(mu - mean) < 4 * sd / Math.sqrt(n), `mean ${mu} vs ${mean}`)
})

test('gibbsJointExponential: determinism, support and stationary marginal mean', () => {
  const a = gibbsJointExponential(VM.sampling.seededRandom(0), 10000, 2, 5, 3, 1, 1)
  const b = gibbsJointExponential(VM.sampling.seededRandom(0), 10000, 2, 5, 3, 1, 1)
  assert.deepEqual(a, b)
  assert.equal(a.x.length, 10001)
  assert.deepEqual([a.x[0], a.y[0]], [1, 1])
  for (let i = 0; i <= 10000; i++) {
    assert.ok(a.x[i] >= 0 && a.x[i] <= 5 && a.y[i] >= 0 && a.y[i] <= 3)
  }
  // Exact E[X] by numerically integrating the density on a fine grid. The chain
  // is positively autocorrelated, so allow a generous 5% relative tolerance.
  const m = 400
  let z = 0, ex = 0, ey = 0
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      const x = 5 * (i + 0.5) / m, y = 3 * (j + 0.5) / m
      const f = jointExponentialDensity(x, y, 2, 5, 3)
      z += f
      ex += f * x
      ey += f * y
    }
  }
  const s = chainSummary(a, 10000)
  assert.ok(Math.abs(s.mx - ex / z) < 0.05 * (ex / z), `E[X] ${s.mx} vs ${ex / z}`)
  assert.ok(Math.abs(s.my - ey / z) < 0.05 * (ey / z), `E[Y] ${s.my} vs ${ey / z}`)
})

test('densities and grid', () => {
  assert.equal(jointExponentialDensity(-0.1, 1, 2, 5, 3), 0)
  assert.equal(jointExponentialDensity(1, 3.1, 2, 5, 3), 0)
  assert.equal(jointExponentialDensity(0, 2, 2, 5, 3), 1)
  // The bivariate normal density integrates to 1 (Riemann sum on [-8, 8]^2).
  const h = 0.05
  let total = 0
  for (let x = -8; x <= 8; x += h) {
    for (let y = -8; y <= 8; y += h) total += bivariateNormalDensity(x, y, 0.6) * h * h
  }
  assert.ok(Math.abs(total - 1) < 1e-3, `mass ${total}`)
  const grid = densityGrid((x, y) => x + 10 * y, 0, 3, 4)
  assert.deepEqual(grid.x, [0, 1, 2, 3])
  assert.deepEqual(grid.z[2], [20, 21, 22, 23])
})

test('bivariate normal chain: sample moments, ACF theory, summary and plot paths', () => {
  const rho = 0.5
  const chain = VM.mcmc.gibbsBivariateNormal({
    rho, n: 10000, start: [0, 0], gaussian: VM.sampling.gaussianRandom(VM.sampling.seededRandom(0))
  })
  const s = chainSummary(chain, 10000)
  // Means 0 with sd ~ sqrt(tau / n), tau the integrated autocorrelation time
  // (1 + rho^2) / (1 - rho^2) = 1.67 for this chain; allow 4 sigma.
  const tol = 4 * Math.sqrt(1.67 / 10000)
  assert.ok(Math.abs(s.mx) < tol && Math.abs(s.my) < tol, `means ${s.mx}, ${s.my}`)
  assert.ok(Math.abs(s.corr - rho) < 0.05, `corr ${s.corr}`)
  // Lag-1 autocorrelation of X is rho^2.
  const acf = VM.mcmc.autocorrelation(s.xs, 3)
  const theory = gibbsAcfTheory(rho, 3)
  assert.deepEqual(theory, [1, 0.25, 0.0625, 0.015625])
  assert.ok(Math.abs(acf[1] - theory[1]) < 0.05, `acf1 ${acf[1]}`)

  assert.ok(Number.isNaN(chainSummary({x: [0, 1, 1], y: [0, 2, 3]}, 2).corr))
  const path = staircasePath(chain, 5)
  assert.equal(path.x.length, 11)
  assert.equal(path.x[1], chain.x[1])
  assert.equal(path.y[1], chain.y[0])
  assert.equal(path.x[2], chain.x[1])
  assert.equal(path.y[2], chain.y[1])
})

test('normalContours: points lie at Mahalanobis radius 1, 2, 3', () => {
  const rho = -0.7
  const c = normalContours(rho)
  let radiusIndex = 0
  for (let i = 0; i < c.x.length; i++) {
    if (c.x[i] === null) {
      radiusIndex++
      continue
    }
    const q = (c.x[i] ** 2 - 2 * rho * c.x[i] * c.y[i] + c.y[i] ** 2) / (1 - rho * rho)
    assert.ok(Math.abs(q - (radiusIndex + 1) ** 2) < 1e-9)
  }
  assert.equal(radiusIndex, 3)
})
