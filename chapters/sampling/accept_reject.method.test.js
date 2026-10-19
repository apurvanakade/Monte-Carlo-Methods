/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { arTarget, arBeta, drawBoxProposals, drawBetaProposals, arEfficiency } from './accept_reject.method.js'

const VM = loadVM()

function acceptedXs(s) {
  const kept = []
  for (let i = 0; i < s.xs.length; i++) {
    if (s.accepted[i]) kept.push(s.xs[i])
  }
  return kept
}

test('densities integrate to 1', () => {
  // Midpoint rule; both are piecewise polynomials so this is accurate.
  let t = 0, b = 0
  const m = 10000
  for (let i = 0; i < m; i++) {
    t += arTarget((i + 0.5) / m) / m
    b += arBeta((i + 0.5) / m) / m
  }
  assert.ok(Math.abs(t - 1) < 1e-6 && Math.abs(b - 1) < 1e-6)
  assert.equal(arTarget(-0.1), 0)
  assert.equal(arBeta(1.1), 0)
})

test('box proposals: acceptance rate is 1/M', () => {
  // P(accept) = (area under the target) / (box area) = 1 / M.
  const n = 10000, M = 2
  const s = drawBoxProposals(VM.sampling.seededRandom(1), n, M)
  const p = 1 / M
  assert.equal(s.xs.length, n)
  assert.ok(Math.abs(arEfficiency(s) - p) < 4 * Math.sqrt(p * (1 - p) / n))
  for (let i = 0; i < n; i++) assert.ok(s.ys[i] >= 0 && s.ys[i] < M)
})

test('beta proposals: acceptance rate is 1/M and accepted x follow the target', () => {
  const n = 10000, M = 4 / 3
  const s = drawBetaProposals(VM.sampling.seededRandom(2), n, M)
  const p = 1 / M
  assert.ok(Math.abs(arEfficiency(s) - p) < 4 * Math.sqrt(p * (1 - p) / n))
  // The triangular target has mean 1/2 and variance 1/24.
  const kept = acceptedXs(s)
  let mean = 0
  for (const x of kept) mean += x
  mean /= kept.length
  let v = 0
  for (const x of kept) v += (x - mean) * (x - mean)
  v /= kept.length
  assert.ok(Math.abs(mean - 0.5) < 4 * Math.sqrt(1 / 24 / kept.length))
  assert.ok(Math.abs(v - 1 / 24) < 0.003, `variance ${v}`)
  // The proposal y never exceeds M g(x).
  for (let i = 0; i < n; i++) assert.ok(s.ys[i] <= M * arBeta(s.xs[i]) + 1e-12)
})

test('box proposals: accepted histogram matches the target; deterministic', () => {
  const s = drawBoxProposals(VM.sampling.seededRandom(1), 10000, 2)
  const kept = acceptedXs(s)
  // P(x < 1/4) = integral of 4x = 1/8 under the target.
  let c = 0
  for (const x of kept) {
    if (x < 0.25) c++
  }
  const p = 0.125
  assert.ok(Math.abs(c / kept.length - p) < 4 * Math.sqrt(p * (1 - p) / kept.length))
  const t = drawBoxProposals(VM.sampling.seededRandom(1), 10000, 2)
  assert.deepEqual(s.xs, t.xs)
})
