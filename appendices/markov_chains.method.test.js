/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Checks the Markov-chain computations against theory, with the page's own
// seeds and the installed mathviz generator.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../scripts/load-vm.mjs'
import { transitionMatrix, firstBelowThreshold, cycleWalk, visitFrequencies, thin, acfRuns, acfSimilarity, makeWalkGraphs, symmetrizedWalkMatrix, walkMixing } from './markov_chains.method.js'

const VM = loadVM()

const states = ['A', 'B', 'C', 'D']
const edges = [['A', 'B', 1], ['B', 'C', 1 / 3], ['B', 'A', 1 / 3], ['B', 'D', 1 / 3],
  ['C', 'B', 1 / 2], ['C', 'D', 1 / 2], ['D', 'B', 1 / 2], ['D', 'C', 1 / 2]]
const stationary = [1 / 8, 3 / 8, 2 / 8, 2 / 8]

test('transitionMatrix: rows sum to 1 and pi = deg/(2|E|) is stationary', () => {
  const P = transitionMatrix(states, edges)
  assert.equal(P[0][1], 1)
  assert.equal(P[1][3], 1 / 3)
  for (const row of P) {
    let sum = 0
    for (const p of row) sum += p
    assert.ok(Math.abs(sum - 1) < 1e-12)
  }
  // The chain is the simple walk on a graph with 4 edges, so pi_i = deg(i) / 8.
  for (let j = 0; j < 4; j++) {
    let value = 0
    for (let i = 0; i < 4; i++) value += stationary[i] * P[i][j]
    assert.ok(Math.abs(value - stationary[j]) < 1e-12)
  }
})

test('firstBelowThreshold: TV decreases to 0 and the mixing time is the first step below 1/4', () => {
  const P = transitionMatrix(states, edges)
  const evolution = VM.mcmc.evolveDistribution(P, [1, 0, 0, 0], 15)
  const {tvd, mixingTime} = firstBelowThreshold(evolution, stationary, 0.25)
  assert.equal(tvd.length, 16)
  // The chain has period 2 only if bipartite; here the triangle B-C-D makes it
  // aperiodic, so the distance must end near 0.
  assert.ok(tvd[15] < 0.01, `tv ${tvd[15]}`)
  assert.ok(mixingTime !== null)
  assert.ok(tvd[mixingTime] < 0.25)
  for (let t = 0; t < mixingTime; t++) assert.ok(tvd[t] >= 0.25)
  assert.equal(firstBelowThreshold(evolution, stationary, -1).mixingTime, null)
})

test('cycleWalk: steps are +-1 mod n, frequencies near uniform, deterministic', () => {
  const n = 15
  const walk = cycleWalk(VM.sampling.seededRandom(3), n, 5000)
  assert.equal(walk.length, 5001)
  assert.equal(walk[0], 0)
  for (let i = 0; i < 5000; i++) {
    const d = (walk[i + 1] - walk[i] + n) % n
    assert.ok(d === 1 || d === n - 1)
  }
  const freq = visitFrequencies(walk, n)
  let sum = 0, maxDev = 0
  for (const f of freq) {
    sum += f
    maxDev = Math.max(maxDev, Math.abs(f - 1 / n))
  }
  assert.ok(Math.abs(sum - 1) < 1e-12)
  // The stationary law is uniform; the 5000-step walk is correlated (it needs
  // ~n^2 steps to mix), so allow a generous 0.04 around 1/15 = 0.067.
  assert.ok(maxDev < 0.04, `max deviation ${maxDev}`)
  assert.deepEqual(cycleWalk(VM.sampling.seededRandom(3), n, 5000), walk)
})

test('thin: every k-th entry from the start index', () => {
  assert.deepEqual(thin([0, 1, 2, 3, 4, 5, 6, 7], 1, 3), [1, 4, 7])
})

test('acfRuns and acfSimilarity: lag 0 is 1, similarity of identical ACFs is 0', () => {
  const walk = cycleWalk(VM.sampling.seededRandom(3), 15, 5000)
  const runs = acfRuns(walk, [0, 500], 49)
  assert.equal(runs[0].acf.length, 50)
  assert.ok(Math.abs(runs[0].acf[0] - 1) < 1e-9)
  // A random walk on the cycle is positively correlated at short lags.
  assert.ok(runs[0].acf[1] > 0.5)
  assert.equal(acfSimilarity(runs[0].acf, runs[0].acf), 0)
  assert.equal(acfSimilarity([1, 0], [0, 1, 5]), 1)
})

test('makeWalkGraphs: vertex and edge counts of each family', () => {
  const g = makeWalkGraphs()
  assert.equal(g.size, 11)
  const barbell = g.get('Barbell (bottleneck)')
  // Two K_8 (28 edges each) plus the two edges through the middle vertex.
  assert.equal(barbell.nodeCount, 17)
  assert.equal(barbell.edges.length, 58)
  assert.equal(g.get('Complete graph (n = 15)').edges.length, 105)
  assert.equal(g.get('Cycle (n = 21)').edges.length, 21)
  assert.equal(g.get('Path (n = 31)').edges.length, 30)
  assert.equal(g.get('Binary tree (depth 4)').nodeCount, 31)
  assert.equal(g.get('Grid 5 × 5').edges.length, 40)
  assert.equal(g.get('Star (n = 15)').nodeCount, 15)
  assert.equal(g.get('Lollipop').edges.length, 28 + 8)
  assert.equal(g.get('3 cliques (3 bottlenecks, cyclic)').edges.length, 3 * 36 + 3)
  assert.equal(g.get('4 cliques (3 bottlenecks)').edges.length, 4 * 36 + 3)
  for (const [, graph] of g) {
    for (const [u, v] of graph.edges) assert.ok(u !== v && u < graph.nodeCount && v < graph.nodeCount)
  }
})

test('walk spectrum: lazy walk has eigenvalue 1, gap > 0 and stationary pi = deg/2|E|', () => {
  const g = makeWalkGraphs().get('Barbell (bottleneck)')
  const {P, degrees, stationary: pi} = VM.discreteMath.randomWalkMatrix(g.nodeCount, g.edges, {lazy: true})
  const ev = VM.numerical.symmetricEigenvalues(symmetrizedWalkMatrix(P, degrees))
  // Eigenvalues come largest first. A lazy walk has spectrum in [0, 1] and a
  // connected graph has a simple top eigenvalue 1.
  assert.ok(Math.abs(ev[0] - 1) < 1e-8)
  assert.ok(ev[1] < 1 - 1e-6 && ev[ev.length - 1] > -1e-8)
  let total = 0
  for (const p of pi) total += p
  assert.ok(Math.abs(total - 1) < 1e-12)
})

test('walkMixing: the complete graph mixes at once, the path takes longer, times are consistent', () => {
  const graphs = makeWalkGraphs()
  const results = {}
  for (const name of ['Complete graph (n = 15)', 'Path (n = 31)']) {
    const g = graphs.get(name)
    const {P, stationary: pi} = VM.discreteMath.randomWalkMatrix(g.nodeCount, g.edges, {lazy: true})
    results[name] = walkMixing(P, pi, 0, 200, 0.25)
    const r = results[name]
    assert.equal(r.tv.length, 201)
    // Each distribution stays a probability vector.
    let sum = 0
    for (const p of r.distributions[50]) sum += p
    assert.ok(Math.abs(sum - 1) < 1e-9)
    // The reported time is the start of the final stretch at or below the threshold.
    if (r.mixingTime !== null) {
      for (let t = r.mixingTime; t <= 200; t++) assert.ok(r.tv[t] <= 0.25)
      if (r.mixingTime > 0) assert.ok(r.tv[r.mixingTime - 1] > 0.25)
    }
  }
  const complete = results['Complete graph (n = 15)']
  assert.ok(complete.mixingTime !== null && complete.mixingTime <= 3, `complete ${complete.mixingTime}`)
  // The page notes the 31-vertex path takes up to 342 steps, beyond 200.
  assert.equal(results['Path (n = 31)'].mixingTime, null)
})
