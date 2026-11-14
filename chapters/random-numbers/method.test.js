/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { kolmogorovPdf } from './method.js'

test('kolmogorovPdf: integrates to 1 and has the 5% critical value 1.36', () => {
  // Midpoint rule on (0, 6); the tail beyond 6 is ~1e-31.
  const m = 60000, h = 6 / m
  let total = 0, upper = 0
  for (let i = 0; i < m; i++) {
    const z = (i + 0.5) * h
    const f = kolmogorovPdf(z)
    assert.ok(f >= -1e-12, `negative density at ${z}`)
    total += f * h
    if (z > 1.36) upper += f * h
  }
  assert.ok(Math.abs(total - 1) < 1e-4, `total ${total}`)
  // P(K > 1.36) = 0.05 (table value 1.358, so allow rounding).
  assert.ok(Math.abs(upper - 0.05) < 0.002, `upper ${upper}`)
})

test('kolmogorovPdf: the two series agree near z = 1', () => {
  assert.ok(Math.abs(kolmogorovPdf(0.9999) - kolmogorovPdf(1.0001)) < 1e-3)
})
