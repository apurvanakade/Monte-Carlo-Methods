/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Checks the Ising samplers against exact enumeration on a 3 x 3 torus and
// against known limiting behaviour, with fixed seeds.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import {
  isingTc, isingRandomLattice, isingMagnetization, isingNeighbours, isingGibbsSweep,
  isingMetropolisSweep, isingCopy, isingAnnealRun, isingRun
} from './ising.method.js'

const VM = loadVM()

// Exact E|M| and E[M^2] of the 3 x 3 torus at inverse temperature beta, summing
// the Boltzmann weights exp(beta * sum of neighbouring products) over 2^9 states.
function exactMoments(beta) {
  const L = 3
  let Z = 0, absM = 0, m2 = 0
  for (let code = 0; code < 512; code++) {
    const lattice = []
    for (let i = 0; i < L; i++) {
      const row = []
      for (let j = 0; j < L; j++) {
        if ((code >> (3 * i + j)) & 1) {
          row.push(1)
        } else {
          row.push(-1)
        }
      }
      lattice.push(row)
    }
    let bonds = 0
    for (let i = 0; i < L; i++) {
      for (let j = 0; j < L; j++) {
        bonds += lattice[i][j] * (lattice[(i + 1) % L][j] + lattice[i][(j + 1) % L])
      }
    }
    const w = Math.exp(beta * bonds)
    const m = isingMagnetization(lattice)
    Z += w
    absM += w * Math.abs(m)
    m2 += w * m * m
  }
  return {absM: absM / Z, m2: m2 / Z}
}

function sampledMoments(sweep, beta, seed, sweeps) {
  const rng = VM.sampling.seededRandom(seed)
  const lattice = isingRandomLattice(3, rng)
  for (let s = 0; s < 200; s++) sweep(lattice, beta, rng)
  let absM = 0, m2 = 0
  for (let s = 0; s < sweeps; s++) {
    sweep(lattice, beta, rng)
    const m = isingMagnetization(lattice)
    absM += Math.abs(m)
    m2 += m * m
  }
  return {absM: absM / sweeps, m2: m2 / sweeps}
}

test('helpers: lattice entries, magnetization and periodic neighbours', () => {
  const lattice = isingRandomLattice(6, VM.sampling.seededRandom(3))
  assert.equal(lattice.length, 6)
  for (const row of lattice) {
    assert.equal(row.length, 6)
    for (const s of row) assert.ok(s === 1 || s === -1)
  }
  assert.equal(isingMagnetization([[1, 1], [1, 1]]), 1)
  assert.equal(isingMagnetization([[1, -1], [-1, 1]]), 0)
  // Corner site wraps around: neighbours are (1,0), (3,0), (0,1), (0,3).
  const L4 = [[1, 2, 0, 3], [4, 0, 0, 0], [0, 0, 0, 0], [5, 0, 0, 0]]
  assert.equal(isingNeighbours(L4, 0, 0), 4 + 5 + 2 + 3)
  const c = isingCopy(L4)
  c[0][0] = 99
  assert.equal(L4[0][0], 1)
  assert.ok(Math.abs(isingTc - 2.2692) < 1e-4)
})

test('Gibbs sweeps reproduce the exact Boltzmann moments of a 3 x 3 torus', () => {
  // The Gibbs sweep leaves the Boltzmann distribution stationary, so long-run
  // averages of |M| and M^2 must match the exact enumeration (beta = 0.4 is
  // between disordered and ordered, so the check is not trivial).
  const exact = exactMoments(0.4)
  const got = sampledMoments(isingGibbsSweep, 0.4, 11, 40000)
  assert.ok(Math.abs(got.absM - exact.absM) < 0.02, `E|M| ${got.absM} vs ${exact.absM}`)
  assert.ok(Math.abs(got.m2 - exact.m2) < 0.02, `E[M^2] ${got.m2} vs ${exact.m2}`)
})

test('Metropolis sweeps reproduce the same exact moments', () => {
  // Metropolis with symmetric single-flip proposals satisfies detailed balance
  // with the same Boltzmann distribution.
  const exact = exactMoments(0.4)
  const got = sampledMoments(isingMetropolisSweep, 0.4, 12, 40000)
  assert.ok(Math.abs(got.absM - exact.absM) < 0.02, `E|M| ${got.absM} vs ${exact.absM}`)
  assert.ok(Math.abs(got.m2 - exact.m2) < 0.02, `E[M^2] ${got.m2} vs ${exact.m2}`)
})

test('beta = 0 gives independent fair spins; large beta orders the lattice', () => {
  // At beta = 0 the Gibbs conditional is 1/2 for every site, so E[M^2] = 1/N^2.
  const L = 10
  const rng = VM.sampling.seededRandom(5)
  const lattice = isingRandomLattice(L, rng)
  let m2 = 0
  const sweeps = 4000
  for (let s = 0; s < sweeps; s++) {
    isingGibbsSweep(lattice, 0, rng)
    m2 += isingMagnetization(lattice) ** 2
  }
  assert.ok(Math.abs(m2 / sweeps - 1 / (L * L)) < 0.004, `E[M^2] ${m2 / sweeps}`)
  // At T = 1 (well below Tc) a long run is strongly magnetized.
  const cold = isingRun(isingGibbsSweep, 1.0, VM.sampling.seededRandom(2))
  assert.ok(Math.abs(cold.magnetizations[cold.magnetizations.length - 1]) > 0.9)
})

test('isingRun and isingAnnealRun: shapes, support and determinism', () => {
  const a = isingRun(isingMetropolisSweep, 2.5, VM.sampling.seededRandom(8))
  const b = isingRun(isingMetropolisSweep, 2.5, VM.sampling.seededRandom(8))
  assert.deepEqual(a, b)
  assert.equal(a.magnetizations.length, 100)
  for (const m of a.magnetizations) assert.ok(m >= -1 && m <= 1)

  const run = isingAnnealRun(VM.sampling.seededRandom(42))
  assert.equal(run.temperatures.length, 10000)
  assert.equal(run.magnetizations.length, 10000)
  assert.equal(run.saved.length, 8)
  assert.equal(run.temperatures[0], 1.4)
  assert.ok(run.temperatures[9999] < 3.0)
  // Snapshots are independent copies whose magnetization matches the record.
  for (const snap of run.saved) {
    assert.ok(Math.abs(isingMagnetization(snap.lattice) - snap.M) < 1e-12)
  }
  // Below Tc the magnetization is large, well above Tc it is small.
  let cold = 0, hot = 0
  for (let i = 0; i < 1000; i++) {
    cold += Math.abs(run.magnetizations[i])
    hot += Math.abs(run.magnetizations[9000 + i])
  }
  assert.ok(cold / 1000 > 0.85, `cold ${cold / 1000}`)
  assert.ok(hot / 1000 < 0.35, `hot ${hot / 1000}`)
})
