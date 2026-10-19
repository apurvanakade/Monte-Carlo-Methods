/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Checks the M/M/n queue simulation against queueing theory, with fixed seeds
// and the installed mathviz generator.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { mmnSimulate, waitAndSojourn } from './mmn.method.js'

loadVM()
const mean = values => {
  let s = 0
  for (const v of values) s += v
  return s / values.length
}

test('mmnSimulate: invariants and determinism', () => {
  const params = {arrivalRate: 2.0, serviceRate: 1.5, servers: 2, maxCustomers: 1000, seed: 42}
  const sim = mmnSimulate(params)
  let departed = 0
  for (let id = 0; id < sim.departure.length; id++) {
    if (sim.departure[id] === undefined) continue
    departed++
    assert.ok(sim.start[id] >= sim.arrival[id])
    assert.ok(sim.departure[id] >= sim.start[id])
  }
  assert.equal(departed, 1000)
  for (let k = 1; k < sim.log.times.length; k++) assert.ok(sim.log.times[k] >= sim.log.times[k - 1])
  assert.equal(sim.log.times.length, sim.log.lengths.length)
  for (const q of sim.log.lengths) assert.ok(q >= 0)
  assert.deepEqual(sim, mmnSimulate(params))
})

test('mmnSimulate: mean wait and sojourn match the Erlang-C formulas', () => {
  // lambda = 2, mu = 1.5, n = 2: a = lambda / mu = 4/3, rho = a / n = 2/3,
  // P0 = 1 / (1 + a + a^2 / (n (1 - rho))) = 0.2, P(wait) = 8/15,
  // Wq = P(wait) / (n mu - lambda) = 8/15, W = Wq + 1/mu = 1.2.
  // A long run (40000 customers) is within 10% of both.
  const sim = mmnSimulate({arrivalRate: 2.0, serviceRate: 1.5, servers: 2, maxCustomers: 40000, seed: 7})
  const {waits, sojourns} = waitAndSojourn(sim)
  assert.equal(waits.length, 40000)
  const wq = mean(waits), w = mean(sojourns)
  assert.ok(Math.abs(wq / (8 / 15) - 1) < 0.1, `Wq ${wq}`)
  assert.ok(Math.abs(w / 1.2 - 1) < 0.1, `W ${w}`)
})

test('mmnSimulate: with one server and tiny arrival rate nobody waits', () => {
  const sim = mmnSimulate({arrivalRate: 0.01, serviceRate: 5, servers: 1, maxCustomers: 200, seed: 3})
  const {waits} = waitAndSojourn(sim)
  let waited = 0
  for (const x of waits) {
    if (x > 0) waited++
  }
  assert.ok(waited <= 2, `waited ${waited}`)
})
