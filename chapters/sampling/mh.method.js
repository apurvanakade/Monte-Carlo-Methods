/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The simulations behind mh.qmd: random-walk Metropolis on a planar region
// (uniform target) and Metropolis for the standard normal with a uniform
// proposal. Imported by the page's OJS cells and by mh.method.test.js. Pure
// functions of numbers and a random source `rng` (a function returning
// uniforms on [0, 1), e.g. from VM.sampling.seededRandom); the chain itself
// is VM.mcmc.randomWalkMetropolis, read as globalThis.VM. No DOM, no OJS.

function circleOutline(cx, cy, r) {
  const xs = [], ys = []
  for (let k = 0; k <= 120; k++) {
    xs.push(cx + r * Math.cos(2 * Math.PI * k / 120))
    ys.push(cy + r * Math.sin(2 * Math.PI * k / 120))
  }
  return {xs, ys}
}

// The two regions the random walk samples uniformly from. Each: membership
// test, outline (null-separated polyline), a starting point inside it, fixed
// axis ranges, and the uniform distribution's mean -- the value the running
// averages converge to.
export function makeRegions() {
  const left = circleOutline(-1, 0, 1)
  const right = circleOutline(1, 0, 1)
  return new Map([
    ["L-shape", {
      inside: (x, y) => (x >= 0 && x <= 1 && y >= 0 && y <= 0.1) || (x >= 0 && x <= 0.1 && y >= 0 && y <= 1),
      outlineX: [0, 1, 1, 0.1, 0.1, 0, 0],
      outlineY: [0, 0, 0.1, 0.1, 1, 1, 0],
      start: [0.05, 0.05],
      // Extra room on the left: the legend floats over the chart's top-left
      // corner, which is where the L's vertical arm would otherwise be.
      xRange: [-0.6, 1.1],
      yRange: [-0.1, 1.1],
      // Area 0.19: the two arms' means weighted by area.
      mean: [(0.1 * 0.5 + 0.09 * 0.05) / 0.19, (0.1 * 0.5 + 0.09 * 0.05) / 0.19]
    }],
    ["Two discs", {
      inside: (x, y) => (x + 1) * (x + 1) + y * y <= 1 || (x - 1) * (x - 1) + y * y <= 1,
      outlineX: [...left.xs, null, ...right.xs],
      outlineY: [...left.ys, null, ...right.ys],
      start: [-1, 0],
      xRange: [-2.2, 2.2],
      yRange: [-1.3, 1.3],
      mean: [0, 0]
    }]
  ])
}

// n states of the random walk Metropolis chain whose target is uniform on
// `region` (log density 0 inside, -Infinity outside). `proposal` is
// "gaussian" or "uniform"; `sigma` is the step scale.
export function regionWalk(region, n, sigma, proposal, rng) {
  return globalThis.VM.mcmc.randomWalkMetropolis({
    logDensity: p => (region.inside(p[0], p[1]) ? 0 : -Infinity),
    start: region.start,
    n,
    scale: sigma,
    proposal,
    rng
  })
}

// The chapter's four Gaussian walks on the L-shape: 10,000 steps from
// (0.05, 0.05) for each step size, each with its own generator seeded 0.
export function lShapeRuns(region) {
  const runs = []
  for (const sigma of [1, 0.5, 0.2, 0.01]) {
    const chain = regionWalk(region, 10000, sigma, "gaussian", globalThis.VM.sampling.seededRandom(0))
    runs.push({sigma, chain})
  }
  return runs
}

// The first n states of a planar chain as coordinate arrays, with the number
// of accepted proposals among steps 1..n-1.
export function regionView(chain, n) {
  const xs = [], ys = []
  let acceptedSteps = 0
  for (let t = 0; t < n; t++) {
    xs.push(chain.samples[t][0])
    ys.push(chain.samples[t][1])
    if (t > 0 && chain.accepted[t]) acceptedSteps++
  }
  return {n, xs, ys, acceptedSteps}
}

// The rejected proposals among steps 1..n-1 of a planar chain.
export function rejectedPoints(chain, n) {
  const xs = [], ys = []
  for (let t = 1; t < n; t++) {
    if (!chain.accepted[t]) {
      xs.push(chain.proposals[t][0])
      ys.push(chain.proposals[t][1])
    }
  }
  return {xs, ys}
}

// n states of Metropolis for the standard normal target p(x) ~ exp(-x^2/2)
// from x0 = 0 with the symmetric proposal Uniform(x - d, x + d). States are
// plain numbers; proposals[t] is a one-element array (null at t = 0).
export function normalWalk(n, d, rng) {
  const run = globalThis.VM.mcmc.randomWalkMetropolis({
    logDensity: p => -0.5 * p[0] * p[0],
    start: [0],
    n,
    scale: d,
    proposal: "uniform",
    rng
  })
  const samples = []
  for (const s of run.samples) samples.push(s[0])
  return {samples, proposals: run.proposals, accepted: run.accepted}
}

// The first min(n, chain length) states of a one-dimensional chain with
// their accepted-step count, sample mean and (population) standard deviation.
export function normalView(chain, n, maxN) {
  const m = Math.min(n, maxN)
  const samples = chain.samples.slice(0, m)
  let acceptedSteps = 0
  let sum = 0
  for (let t = 0; t < m; t++) {
    if (t > 0 && chain.accepted[t]) acceptedSteps++
    sum += samples[t]
  }
  const mean = sum / m
  let sumSq = 0
  for (const x of samples) sumSq += (x - mean) * (x - mean)
  return {n: m, samples, acceptedSteps, mean, sd: Math.sqrt(sumSq / m)}
}

// The rejected proposals among steps 1..n-1 of a one-dimensional chain, as
// (step, proposed value) pairs.
export function rejectedSteps(chain, n) {
  const steps = [], values = []
  for (let t = 1; t < n; t++) {
    if (!chain.accepted[t]) {
      steps.push(t)
      values.push(chain.proposals[t][0])
    }
  }
  return {steps, values}
}
