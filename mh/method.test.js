/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Checks the Metropolis simulations against theory, with the page's own seeds
// and the installed mathviz generator.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../scripts/load-vm.mjs'
import { makeRegions, regionWalk, lShapeRuns, regionView, rejectedPoints, normalWalk, normalView, rejectedSteps } from './method.js'

const VM = loadVM()
const regions = makeRegions()

test('regions: starts lie inside, outlines match, stated means are the uniform means', () => {
  for (const [, r] of regions) {
    assert.ok(r.inside(r.start[0], r.start[1]))
    assert.equal(r.outlineX.length, r.outlineY.length)
  }
  const L = regions.get('L-shape')
  // Area 0.19 = 0.1 + 0.1 - 0.01; Monte Carlo mean of uniform draws in the
  // unit square, kept when inside, must match the closed form.
  const rng = VM.sampling.seededRandom(5)
  let n = 0, sx = 0, sy = 0
  for (let i = 0; i < 400000; i++) {
    const x = rng(), y = rng()
    if (L.inside(x, y)) { n++; sx += x; sy += y }
  }
  assert.ok(Math.abs(n / 400000 - 0.19) < 4 * Math.sqrt(0.19 * 0.81 / 400000))
  assert.ok(Math.abs(sx / n - L.mean[0]) < 0.02, `mean x ${sx / n}`)
  assert.ok(Math.abs(sy / n - L.mean[1]) < 0.02)
})

test('lShapeRuns: chains stay in the region, acceptance falls as sigma grows past the arm width', () => {
  const L = regions.get('L-shape')
  const runs = lShapeRuns(L)
  assert.deepEqual(runs.map(r => r.sigma), [1, 0.5, 0.2, 0.01])
  const rates = []
  for (const run of runs) {
    assert.equal(run.chain.samples.length, 10000)
    for (const p of run.chain.samples) assert.ok(L.inside(p[0], p[1]))
    rates.push(run.chain.acceptedCount / 9999)
  }
  // A tiny step is almost always accepted; a step far larger than the arm
  // width (0.1) is almost always rejected. The prose quotes about 0.07 for
  // sigma 0.5 and about 0.19 for 0.2, the area of the L-shape, which is
  // the acceptance rate of rejection sampling in the unit square.
  assert.ok(rates[3] > 0.9, `sigma 0.01 rate ${rates[3]}`)
  assert.ok(rates[0] < 0.1, `sigma 1 rate ${rates[0]}`)
  assert.ok(rates[0] < rates[1] && rates[1] < rates[2] && rates[2] < rates[3], rates.join(','))
  assert.ok(Math.abs(rates[1] - 0.07) < 0.01, `sigma 0.5 rate ${rates[1]}`)
  assert.ok(Math.abs(rates[2] - 0.19) < 0.01, `sigma 0.2 rate ${rates[2]}`)
})

test('regionWalk: uniform target, running mean approaches the region mean; deterministic per seed', () => {
  const two = regions.get('Two discs')
  const a = regionWalk(two, 20000, 0.5, 'gaussian', VM.sampling.seededRandom(1))
  const b = regionWalk(two, 20000, 0.5, 'gaussian', VM.sampling.seededRandom(1))
  assert.deepEqual(a.samples, b.samples)
  // By symmetry the uniform mean is (0, 0). The chain is correlated, so the
  // tolerance is generous (several times the iid standard error ~ 0.01).
  const v = regionView(a, 20000)
  let sx = 0, sy = 0
  for (let i = 0; i < v.n; i++) { sx += v.xs[i]; sy += v.ys[i] }
  assert.ok(Math.abs(sx / v.n) < 0.15, `mean x ${sx / v.n}`)
  assert.ok(Math.abs(sy / v.n) < 0.15)
  for (const p of a.samples) assert.ok(two.inside(p[0], p[1]))
})

test('regionView / rejectedPoints: counts are consistent with the accepted flags', () => {
  const L = regions.get('L-shape')
  const chain = regionWalk(L, 500, 0.2, 'uniform', VM.sampling.seededRandom(1))
  const v = regionView(chain, 300)
  const rej = rejectedPoints(chain, 300)
  assert.equal(v.xs.length, 300)
  // 299 proposals (steps 1..299) are each accepted or rejected.
  assert.equal(v.acceptedSteps + rej.xs.length, 299)
  // A rejected proposal is outside the region; the chain does not move.
  for (let i = 0; i < rej.xs.length; i++) assert.ok(!L.inside(rej.xs[i], rej.ys[i]))
  for (let t = 1; t < 300; t++) {
    if (!chain.accepted[t]) assert.deepEqual(chain.samples[t], chain.samples[t - 1])
  }
})

test('normalWalk: stationary distribution is N(0, 1)', () => {
  const chain = normalWalk(20000, 2, VM.sampling.seededRandom(1))
  assert.equal(chain.samples.length, 20000)
  assert.equal(chain.samples[0], 0)
  const v = normalView(chain, 20000, 20000)
  // The ESS of this chain is a few thousand, so the mean's standard error is
  // about 1/sqrt(ESS) <= 0.03; allow 4 of those, and 0.1 for the sd.
  const ess = VM.mcmc.effectiveSampleSize(v.samples)
  const se = 1 / Math.sqrt(ess)
  assert.ok(Math.abs(v.mean) < 4 * se, `mean ${v.mean}, se ${se}`)
  assert.ok(Math.abs(v.sd - 1) < 0.1, `sd ${v.sd}`)
  // Empirical CDF at 0 and 1 against Phi (0.5, 0.8413), within a few ESS errors.
  let below0 = 0, below1 = 0
  for (const x of v.samples) { if (x <= 0) below0++; if (x <= 1) below1++ }
  assert.ok(Math.abs(below0 / v.n - 0.5) < 4 * 0.5 / Math.sqrt(ess))
  assert.ok(Math.abs(below1 / v.n - 0.8413) < 4 * 0.37 / Math.sqrt(ess))
})

test('normalView / rejectedSteps: truncation and counts; same seed, same chain', () => {
  const a = normalWalk(1000, 2, VM.sampling.seededRandom(3))
  const b = normalWalk(1000, 2, VM.sampling.seededRandom(3))
  assert.deepEqual(a.samples, b.samples)
  // The display length is min(N, Max N).
  assert.equal(normalView(a, 5000, 1000).n, 1000)
  const v = normalView(a, 200, 1000)
  assert.equal(v.samples.length, 200)
  const rej = rejectedSteps(a, 200)
  assert.equal(v.acceptedSteps + rej.steps.length, 199)
  for (let i = 0; i < rej.steps.length; i++) {
    const t = rej.steps[i]
    assert.equal(a.samples[t], a.samples[t - 1])
    assert.equal(rej.values[i], a.proposals[t][0])
  }
})

test('normalWalk: acceptance is near 1 for tiny d, low for huge d, and ESS peaks in between', () => {
  const rate = (d) => {
    const c = normalWalk(5000, d, VM.sampling.seededRandom(1))
    return normalView(c, 5000, 5000)
  }
  const tiny = rate(0.1), mid = rate(2.5), huge = rate(6)
  // For d -> 0 the ratio p(y)/p(x) -> 1 so nearly everything is accepted;
  // for d = 6 only the few proposals landing near the mode are.
  assert.ok(tiny.acceptedSteps / 4999 > 0.95)
  assert.ok(huge.acceptedSteps / 4999 < 0.45)
  const essOf = v => VM.mcmc.effectiveSampleSize(v.samples)
  assert.ok(essOf(mid) > essOf(tiny) && essOf(mid) > essOf(huge), `${essOf(tiny)} ${essOf(mid)} ${essOf(huge)}`)
})
