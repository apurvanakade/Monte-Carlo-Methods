/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../scripts/load-vm.mjs'
import { mixtureCurves } from './method.js'

loadVM()

function moments(xs, ys) {
  const h = xs[1] - xs[0]
  let mass = 0, mean = 0, second = 0
  for (let i = 0; i < xs.length; i++) {
    mass += ys[i] * h
    mean += xs[i] * ys[i] * h
    second += xs[i] * xs[i] * ys[i] * h
  }
  return {mass, mean, variance: second - mean * mean}
}

test('mixture and combination are densities with the theoretical moments', () => {
  const c = mixtureCurves(0.7, 0.3, -2, 1, 2, 0.5, -10, 10, 4000)
  const mix = moments(c.xs, c.mixture)
  const comb = moments(c.xs, c.combination)
  assert.ok(Math.abs(mix.mass - 1) < 1e-6 && Math.abs(comb.mass - 1) < 1e-6)
  // Mixture mean = sum w_i mu_i; mixture variance = sum w_i (sd_i^2 + mu_i^2) - mean^2.
  const mean = 0.7 * -2 + 0.3 * 2
  const variance = 0.7 * (1 + 4) + 0.3 * (0.25 + 4) - mean * mean
  assert.ok(Math.abs(mix.mean - mean) < 1e-6)
  assert.ok(Math.abs(mix.variance - variance) < 1e-6)
  // Combination: mean w1 mu1 + w2 mu2, variance w1^2 sd1^2 + w2^2 sd2^2.
  assert.ok(Math.abs(comb.mean - mean) < 1e-6)
  assert.ok(Math.abs(comb.variance - (0.49 + 0.09 * 0.25)) < 1e-6)
})
