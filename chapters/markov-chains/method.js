/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The Markov-chain computations behind markov_chains.qmd: the example chain's
// matrix, the mixing time from total variation, the random walk on a cycle
// and its diagnostics, and the graph-walk app's graphs and spectrum. Imported
// by the page's OJS cells and by method.test.js. Pure functions
// of numbers and a random source `rng` (a function returning uniforms on
// [0, 1), e.g. from VM.sampling.seededRandom); the library is read as
// globalThis.VM; no DOM, no OJS.

// The transition matrix of the walk with the given directed, weighted edges
// [from, to, p] on named states: P[i][j] is the probability of i -> j.
export function transitionMatrix(states, edges) {
  const P = []
  for (let i = 0; i < states.length; i++) P.push(new Array(states.length).fill(0))
  for (const [from, to, p] of edges) P[states.indexOf(from)][states.indexOf(to)] = p
  return P
}

// Total variation distance of each distribution from `stationary`, and the
// first step at which it is below `threshold` (null if it never is).
export function firstBelowThreshold(distributions, stationary, threshold) {
  const VM = globalThis.VM
  const tvd = []
  let mixingTime = null
  for (let t = 0; t < distributions.length; t++) {
    const d = VM.mcmc.totalVariation(distributions[t], stationary)
    tvd.push(d)
    if (mixingTime === null && d < threshold) mixingTime = t
  }
  return {tvd, mixingTime}
}

// A simple random walk on the n-cycle: `steps` steps from vertex 0, each to
// one of the two neighbours with probability 1/2. Returns steps + 1 vertices.
export function cycleWalk(rng, n, steps) {
  const walk = [0]
  for (let i = 0; i < steps; i++) {
    let step = 1
    if (rng() < 0.5) step = -1
    walk.push((walk[i] + step + n) % n)
  }
  return walk
}

// Fraction of time spent at each of the n vertices.
export function visitFrequencies(walk, n) {
  const counts = new Array(n).fill(0)
  for (const v of walk) counts[v] += 1
  const out = []
  for (const c of counts) out.push(c / walk.length)
  return out
}

// Every `every`-th entry of the walk from index `start` on.
export function thin(walk, start, every) {
  const out = []
  for (let i = start; i < walk.length; i += every) out.push(walk[i])
  return out
}

// The autocorrelation function (lags 0..maxLag) of the chain after each
// candidate burn-in.
export function acfRuns(walk, burnIns, maxLag) {
  const runs = []
  for (const burnIn of burnIns) {
    runs.push({burnIn, acf: globalThis.VM.mcmc.autocorrelation(walk.slice(burnIn), maxLag)})
  }
  return runs
}

// The mean absolute difference of two autocorrelation functions over their
// common lags.
export function acfSimilarity(a, b) {
  const count = Math.min(a.length, b.length)
  let total = 0
  for (let lag = 0; lag < count; lag++) total += Math.abs(a[lag] - b[lag])
  return total / count
}

// The graph-walk app's graphs, as {nodeCount, edges}, keyed by name.
export function makeWalkGraphs() {
  const complete = (offset, size, edges) => {
    for (let i = 0; i < size; i++) {
      for (let j = i + 1; j < size; j++) edges.push([offset + i, offset + j])
    }
  }
  const path = (nodeCount) => {
    const edges = []
    for (let i = 0; i + 1 < nodeCount; i++) edges.push([i, i + 1])
    return {nodeCount, edges}
  }
  const cycle = (nodeCount) => {
    const g = path(nodeCount)
    g.edges.push([nodeCount - 1, 0])
    return g
  }
  const completeGraph = (nodeCount) => {
    const edges = []
    complete(0, nodeCount, edges)
    return {nodeCount, edges}
  }
  const star = (leaves) => {
    const edges = []
    for (let i = 1; i <= leaves; i++) edges.push([0, i])
    return {nodeCount: leaves + 1, edges}
  }
  const grid = (rows, cols) => {
    const edges = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c
        if (c + 1 < cols) edges.push([i, i + 1])
        if (r + 1 < rows) edges.push([i, i + cols])
      }
    }
    return {nodeCount: rows * cols, edges}
  }
  const binaryTree = (depth) => {
    const nodeCount = Math.pow(2, depth + 1) - 1
    const edges = []
    for (let i = 1; i < nodeCount; i++) edges.push([Math.floor((i - 1) / 2), i])
    return {nodeCount, edges}
  }
  // Two K_m joined through one middle vertex: m, m + 1, ..., 2m.
  const barbell = (m) => {
    const edges = []
    complete(0, m, edges)
    complete(m + 1, m, edges)
    edges.push([m - 1, m], [m, m + 1])
    return {nodeCount: 2 * m + 1, edges}
  }
  // K_m with a path of `tail` vertices hanging off it.
  const lollipop = (m, tail) => {
    const edges = []
    complete(0, m, edges)
    for (let i = m - 1; i < m + tail - 1; i++) edges.push([i, i + 1])
    return {nodeCount: m + tail, edges}
  }
  // `count` copies of K_size, consecutive ones joined by a single edge
  // (and the last to the first when cyclic).
  const cliqueChain = (count, size, cyclic) => {
    const edges = []
    for (let k = 0; k < count; k++) complete(k * size, size, edges)
    for (let k = 0; k + 1 < count; k++) edges.push([(k + 1) * size - 1, (k + 1) * size])
    if (cyclic) edges.push([count * size - 1, 0])
    return {nodeCount: count * size, edges}
  }

  return new Map([
    ["Barbell (bottleneck)", barbell(8)],
    ["Complete graph (n = 15)", completeGraph(15)],
    ["Cycle (n = 21)", cycle(21)],
    ["Lollipop", lollipop(8, 8)],
    ["3 cliques (2 bottlenecks)", cliqueChain(3, 9, false)],
    ["3 cliques (3 bottlenecks, cyclic)", cliqueChain(3, 9, true)],
    ["4 cliques (3 bottlenecks)", cliqueChain(4, 9, false)],
    ["Path (n = 31)", path(31)],
    ["Binary tree (depth 4)", binaryTree(4)],
    ["Grid 5 × 5", grid(5, 5)],
    ["Star (n = 15)", star(14)]
  ])

}

// P = D^-1 A is not symmetric, but D^(1/2) P D^(-1/2) is, and has the same
// eigenvalues -- which is what lets a symmetric solver find them.
export function symmetrizedWalkMatrix(P, degrees) {
  const S = []
  for (let i = 0; i < P.length; i++) {
    const row = []
    for (let j = 0; j < P.length; j++) row.push(Math.sqrt(degrees[i] / degrees[j]) * P[i][j])
    S.push(row)
  }
  return S
}

// pi_t for t = 0..maxTime from the all-mass-on-`start` distribution, its
// total variation distance to `stationary` at every step, and the first time
// the distance drops to the threshold and stays there (null if never).
export function walkMixing(P, stationary, start, maxTime, threshold) {
  const VM = globalThis.VM
  const p0 = new Array(P.length).fill(0)
  p0[start] = 1
  const distributions = VM.mcmc.evolveDistribution(P, p0, maxTime)
  const tv = []
  for (const p of distributions) tv.push(VM.mcmc.totalVariation(p, stationary))
  let mixingTime = null
  for (let t = maxTime; t >= 0; t--) {
    if (tv[t] > threshold) break
    mixingTime = t
  }
  return {distributions, tv, mixingTime}
}
