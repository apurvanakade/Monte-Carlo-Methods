/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The simulations behind ising.qmd: the 2D Ising model on a periodic L x L
// lattice, sampled by Gibbs sweeps and by single-spin Metropolis sweeps.
// Imported by the page's OJS cells and by ising.method.test.js. Pure functions
// of numbers and a random source `rng` (a function returning uniforms on
// [0, 1), e.g. from VM.sampling.seededRandom); no DOM, no OJS. Lattices are
// arrays of rows of +1 / -1; the sweeps modify them in place. Here J = 1 and
// beta = 1 / T.

// The limiting critical temperature of the square lattice, 2 / ln(1 + sqrt 2).
export const isingTc = 2 / Math.log(1 + Math.SQRT2)

// An L x L lattice of independent ±1 spins, as an array of rows.
export function isingRandomLattice(L, rng) {
  const lattice = []
  for (let i = 0; i < L; i++) {
    const row = []
    for (let j = 0; j < L; j++) {
      if (rng() < 0.5) {
        row.push(1)
      } else {
        row.push(-1)
      }
    }
    lattice.push(row)
  }
  return lattice
}

export function isingMagnetization(lattice) {
  let sum = 0
  for (const row of lattice) {
    for (const s of row) sum += s
  }
  return sum / (lattice.length * lattice.length)
}

// Sum of the four neighbours of (i, j), with periodic boundaries.
export function isingNeighbours(lattice, i, j) {
  const L = lattice.length
  return lattice[(i + 1) % L][j] + lattice[(i - 1 + L) % L][j] + lattice[i][(j + 1) % L] + lattice[i][(j - 1 + L) % L]
}

// One Gibbs sweep: visit every site in order and redraw its spin from its
// conditional, P(up) = 1 / (1 + exp(-2 beta h)) with h the neighbour sum.
export function isingGibbsSweep(lattice, beta, rng) {
  const L = lattice.length
  for (let i = 0; i < L; i++) {
    for (let j = 0; j < L; j++) {
      const h = isingNeighbours(lattice, i, j)
      const pUp = 1 / (1 + Math.exp(-2 * beta * h))
      if (rng() < pUp) {
        lattice[i][j] = 1
      } else {
        lattice[i][j] = -1
      }
    }
  }
}

// One Metropolis sweep: L² single-spin-flip proposals at random sites.
export function isingMetropolisSweep(lattice, beta, rng) {
  const L = lattice.length
  for (let k = 0; k < L * L; k++) {
    const i = Math.floor(rng() * L)
    const j = Math.floor(rng() * L)
    const dE = 2 * lattice[i][j] * isingNeighbours(lattice, i, j)
    if (dE < 0 || rng() < Math.exp(-beta * dE)) lattice[i][j] = -lattice[i][j]
  }
}

export function isingCopy(lattice) {
  const out = []
  for (const row of lattice) out.push(row.slice())
  return out
}

// Gibbs sampling on a 20 x 20 lattice while the temperature rises linearly
// from 1.4 to 3.0 over 10,000 sweeps (after 1000 sweeps at 1.4 to settle).
// Records the temperature and magnetization after every sweep and 8 evenly
// spaced snapshots.
export function isingAnnealRun(rng) {
  const L = 20, tStart = 1.4, tEnd = 3.0, steps = 10000, snapshots = 8
  const lattice = isingRandomLattice(L, rng)
  for (let s = 0; s < steps / 10; s++) isingGibbsSweep(lattice, 1 / tStart, rng)
  const temperatures = [], magnetizations = [], saved = []
  for (let step = 0; step < steps; step++) {
    const T = tStart + (tEnd - tStart) * step / steps
    isingGibbsSweep(lattice, 1 / T, rng)
    temperatures.push(T)
    magnetizations.push(isingMagnetization(lattice))
    if (step % (steps / snapshots) === 0) saved.push({T, M: magnetizations[step], lattice: isingCopy(lattice)})
  }
  return {temperatures, magnetizations, saved}
}

// A lattice run at a fixed temperature: `sweep` 5000 times from a random
// start, recording the magnetization every 50 sweeps.
export function isingRun(sweep, T, rng) {
  const L = 20, steps = 5000
  const lattice = isingRandomLattice(L, rng)
  const magnetizations = []
  for (let step = 0; step < steps; step++) {
    sweep(lattice, 1 / T, rng)
    if (step % (steps / 100) === 0) magnetizations.push(isingMagnetization(lattice))
  }
  return {T, lattice, magnetizations}
}
