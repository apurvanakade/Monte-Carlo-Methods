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
import { dropPoints, circleEstimate, circleConvergence, dropNeedles, needleCrossings, buffonEstimate } from './method.js'

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

test('circleConvergence: interval width is 2 z sqrt(pi (4 - pi) / n)', () => {
  const z = VM.distributions.normalQuantile(0.975)
  const c = circleConvergence(VM.sampling.seededRandom(42), 10000, z)
  assert.equal(c.sizes.length, 100)
  assert.ok(Math.abs(c.widths[99] - 2 * z * Math.sqrt(Math.PI * (4 - Math.PI) / 10000)) < 1e-12)
  // The 95% interval should cover pi at most of the 100 sizes.
  let covered = 0
  for (let i = 0; i < 100; i++) {
    if (c.lower[i] <= Math.PI && Math.PI <= c.upper[i]) covered++
  }
  assert.ok(covered >= 85, `covered ${covered}`)
})

test('needleCrossings: crossing probability is 2 l / (pi t)', () => {
  const drops = dropNeedles(VM.sampling.seededRandom(1), 2000, 8, 6)
  const length = 0.8
  const c = needleCrossings(drops, length, 1)
  const p = c.crossingCount[2000] / 2000
  const expected = 2 * length / Math.PI
  const sd = Math.sqrt(expected * (1 - expected) / 2000)
  assert.ok(Math.abs(p - expected) < 4 * sd, `p ${p}, expected ${expected}`)
})

test('buffonEstimate: undefined before the first crossing, near pi after', () => {
  assert.equal(buffonEstimate(0, 10, 0.8, 1).estimate, null)
  const drops = dropNeedles(VM.sampling.seededRandom(1), 2000, 8, 6)
  const c = needleCrossings(drops, 0.8, 1)
  const s = buffonEstimate(c.crossingCount[2000], 2000, 0.8, 1)
  assert.ok(s.error < 4 * s.stdError, `error ${s.error}, se ${s.stdError}`)
})
