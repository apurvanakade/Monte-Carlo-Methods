/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { triangularPdf } from './inverse_transform.method.js'

test('triangularPdf: integrates to 1, peaks at the mode, zero outside', () => {
  // A density must have total mass 1; its peak is 2 / (b - a).
  const a = 0, b = 1, c = 0.25, m = 100000
  let total = 0
  for (let i = 0; i < m; i++) total += triangularPdf(a + (b - a) * (i + 0.5) / m, a, b, c) * (b - a) / m
  assert.ok(Math.abs(total - 1) < 1e-6)
  assert.ok(Math.abs(triangularPdf(c, a, b, c) - 2 / (b - a)) < 1e-12)
  assert.equal(triangularPdf(-0.1, a, b, c), 0)
  assert.equal(triangularPdf(1.1, a, b, c), 0)
})
