/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Checks the generators and tests of the random-numbers page against theory,
// with the page's own seeds and the installed mathviz generator.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import {
  mulMod, lcgStep, lcgSequence, lcgOrbit, gcd, primeFactors, hullDobell, lineSpacing, planeSpacing,
  randuMultiplier, randuModulus, smallLcg, generators, drawSample, consecutiveTriples, planeWaveEstimate,
  lcgBits, sequencePeriod, chiSquareTest, monobitTest, countRuns, runsTest, ksStatistic, kolmogorovTail, ksTest,
  testBattery, blockPValues
} from './method.js'

const VM = loadVM()

test('mulMod: agrees with BigInt arithmetic up to a 32-bit modulus', () => {
  // Products here reach 2^64, far past what a double holds exactly; BigInt
  // gives the true remainder.
  const rng = VM.sampling.seededRandom(1)
  for (const m of [16, 1000, 65536, 2147483648, 4294967296]) {
    for (let i = 0; i < 200; i++) {
      const a = Math.floor(rng() * m), x = Math.floor(rng() * m)
      assert.equal(mulMod(a, x, m), Number(BigInt(a) * BigInt(x) % BigInt(m)))
    }
  }
})

test('lcgSequence: the hand computation of the page (m = 16, a = 5, c = 1)', () => {
  // 5 * 0 + 1 = 1, 5 * 1 + 1 = 6, 5 * 6 + 1 = 31 = 15 (mod 16), ...
  assert.deepEqual(lcgSequence(5, 1, 16, 0, 17), [0, 1, 6, 15, 12, 13, 2, 11, 8, 9, 14, 7, 4, 5, 10, 3, 0])
  assert.equal(lcgStep(15, 5, 1, 16), 12)
})

test('lcgOrbit: the periods and tails the exercises state', () => {
  // a = 5: full period. a = 3: a - 1 is not divisible by 4, period 8.
  // a = 6: not a bijection; 0, 1, 7, 11 lead into the fixed point 3.
  assert.deepEqual([lcgOrbit(5, 1, 16, 0).tail, lcgOrbit(5, 1, 16, 0).period], [0, 16])
  assert.deepEqual([lcgOrbit(3, 1, 16, 0).tail, lcgOrbit(3, 1, 16, 0).period], [0, 8])
  const stuck = lcgOrbit(6, 1, 16, 0)
  assert.deepEqual(stuck.states, [0, 1, 7, 11, 3])
  assert.deepEqual([stuck.tail, stuck.period], [4, 1])
})

test('hullDobell: agrees with the brute-force period for every a, c and several m', () => {
  // The theorem: period m from every seed if and only if the three
  // conditions hold. A generator has period m from one seed exactly when it
  // has it from all (one cycle through every state), so seed 0 suffices.
  assert.deepEqual(primeFactors(360), [2, 3, 5])
  assert.equal(gcd(36, 48), 12)
  for (const m of [2, 8, 9, 12, 16, 30, 36, 49, 64, 100]) {
    for (let a = 0; a < m; a++) {
      for (let c = 0; c < m; c++) {
        const orbit = lcgOrbit(a, c, m, 0)
        assert.equal(hullDobell(a, c, m).full, orbit.period === m, `a=${a} c=${c} m=${m}`)
      }
    }
  }
})

test('hullDobell: the multipliers with full period for m = 100, c = 7', () => {
  // a - 1 must be divisible by 2, by 5 and by 4, so by 20.
  const full = []
  for (let a = 1; a < 100; a++) {
    if (hullDobell(a, 7, 100).full) full.push(a)
  }
  assert.deepEqual(full, [1, 21, 41, 61, 81])
})

test('lineSpacing: the gaps the lattice exercise derives', () => {
  // a = 5: lines v = 5u + const, a distance 1/sqrt(1 + 25) apart.
  assert.ok(Math.abs(lineSpacing(5, 1024) - 1 / Math.sqrt(26)) < 1e-12)
  // a = 1021 = -3 (mod 1024): lines 3u + v = const, 1/sqrt(10) apart.
  assert.ok(Math.abs(lineSpacing(1021, 1024) - 1 / Math.sqrt(10)) < 1e-12)
  // The counter a = 1: the single diagonal family u - v = const.
  assert.ok(Math.abs(lineSpacing(1, 1024) - 1 / Math.sqrt(2)) < 1e-12)
  // a = 529 is within 2% of the bound sqrt(sqrt(3) / (2m)) that no lattice of
  // m points per unit area can beat (the hexagonal lattice).
  const bound = Math.sqrt(Math.sqrt(3) / (2 * 1024))
  assert.ok(lineSpacing(529, 1024) >= bound && lineSpacing(529, 1024) < 1.02 * bound)
  for (let a = 1; a < 1024; a += 4) assert.ok(lineSpacing(a, 1024) >= bound - 1e-12)
})

test('lineSpacing: every pair of the orbit lies on the lines it reports', () => {
  // Brute force for a small generator: recover the shortest (s, t) with
  // s + a t = 0 (mod m) by search, and check s x_n + t x_{n+1} = const (mod m).
  const a = 37, c = 1, m = 256
  let best = null
  for (let s = -20; s <= 20; s++) {
    for (let t = -20; t <= 20; t++) {
      if ((s !== 0 || t !== 0) && ((s + a * t) % m + m) % m === 0) {
        if (best === null || s * s + t * t < best[0] * best[0] + best[1] * best[1]) best = [s, t]
      }
    }
  }
  assert.ok(Math.abs(lineSpacing(a, m) - 1 / Math.hypot(best[0], best[1])) < 1e-12)
  const xs = lcgSequence(a, c, m, 0, m + 1)
  const offset = ((best[0] * xs[0] + best[1] * xs[1]) % m + m) % m
  for (let n = 0; n < m; n++) {
    assert.equal(((best[0] * xs[n] + best[1] * xs[n + 1]) % m + m) % m, offset)
  }
})

test('RANDU: triples lie on the 15 planes 9x - 6y + z = k', () => {
  // 65539^2 = 6 * 65539 - 9 (mod 2^31), so x_{n+2} = 6 x_{n+1} - 9 x_n.
  assert.equal(mulMod(randuMultiplier, randuMultiplier, randuModulus), 6 * randuMultiplier - 9)
  const triples = consecutiveTriples('randu', 1, 20000)
  const planes = new Set()
  for (const k of triples.planes) {
    assert.equal(k, Math.round(k))
    planes.add(k)
  }
  // 9u - 6v + w with u, v, w in (0, 1) lies in (-6, 10): k = -5, ..., 9.
  assert.equal(planes.size, 15)
  assert.equal(Math.min(...planes), -5)
  assert.equal(Math.max(...planes), 9)
  // The planes are 1 / |(9, -6, 1)| = 1 / sqrt(118) apart.
  const spacing = planeSpacing(randuMultiplier, randuModulus, 12)
  assert.deepEqual(spacing.normal.map(Math.abs), [9, 6, 1])
  assert.ok(Math.abs(spacing.spacing - 1 / Math.sqrt(118)) < 1e-12)
})

test('RANDU: every state is odd, and a small copy has period m / 4', () => {
  const sample = drawSample('randu', 1, 1000)
  for (const bit of sample.lastBits) assert.equal(bit, 1)
  // The page quotes the period 2^29 = m / 4 for a = 3 (mod 8), odd seed
  // (Knuth 3.2.1.2). 2^29 steps are too many for a test, so check the same
  // statement by brute force for m = 2^12 and every such multiplier.
  const m = 4096
  for (let a = 3; a < m; a += 8) assert.equal(lcgOrbit(a, 0, m, 1).period, m / 4)
  for (let a = 5; a < m; a += 8) assert.equal(lcgOrbit(a, 0, m, 1).period, m / 4)
  assert.equal(randuMultiplier % 8, 3)
})

test('planeWaveEstimate: 0 within 4 standard errors for mulberry32, exactly 1 for RANDU', () => {
  // The integral of cos(2 pi (9x - 6y + z)) over the cube is 0. RANDU makes
  // the argument a multiple of 2 pi, so every value is cos(0) = 1.
  const good = planeWaveEstimate('mulberry32', 1, 100000)
  assert.ok(Math.abs(good.estimate) < 4 * good.stdError, `estimate ${good.estimate}`)
  // Var(cos(2 pi U)) = 1/2, so the standard error is sqrt(1 / (2n)).
  assert.ok(Math.abs(good.stdError - Math.sqrt(0.5 / 100000)) < 1e-4)
  const bad = planeWaveEstimate('randu', 1, 1000)
  assert.ok(Math.abs(bad.estimate - 1) < 1e-9)
  assert.ok(bad.stdError < 1e-6)
})

test('lcgBits: bit j of a full-period power-of-2 LCG has period 2^(j+1)', () => {
  // The last j + 1 bits form a full-period LCG mod 2^(j+1).
  assert.ok(hullDobell(smallLcg.a, smallLcg.c, smallLcg.m).full)
  assert.equal(lcgOrbit(smallLcg.a, smallLcg.c, smallLcg.m, 1).period, 65536)
  const rows = lcgBits(smallLcg.a, smallLcg.c, 16, 1, 2048)
  for (let j = 0; j < 10; j++) {
    const column = rows.map(row => row[j])
    assert.equal(sequencePeriod(column), 2 ** (j + 1))
  }
  // Each row is the binary expansion of its state.
  const xs = lcgSequence(smallLcg.a, smallLcg.c, 65536, 1, 5)
  for (let n = 0; n < 5; n++) {
    let value = 0
    for (let j = 0; j < 16; j++) value += rows[n][j] * 2 ** j
    assert.equal(value, xs[n])
  }
})

test('drawSample: numbers in [0, 1), bits read from the integers', () => {
  for (const name of Object.keys(generators)) {
    const sample = drawSample(name, 1, 500)
    for (let i = 0; i < 500; i++) {
      assert.ok(sample.us[i] >= 0 && sample.us[i] < 1)
      assert.equal(sample.firstBits[i], sample.us[i] >= 0.5 ? 1 : 0)
      assert.equal(sample.lastBits[i], sample.xs[i] % 2)
      assert.ok(Number.isInteger(sample.xs[i]))
    }
  }
  // mulberry32 is the page's own generator, number for number.
  const rng = VM.sampling.seededRandom(7)
  const sample = drawSample('mulberry32', 7, 10)
  for (let i = 0; i < 10; i++) assert.equal(sample.us[i], rng())
})

test('chiSquareTest: exact on a hand example, and mean k - 1 over many samples', () => {
  // Counts 3, 1 in two bins of expected 2: (1 + 1) / 2 = 1.
  const hand = chiSquareTest([0.1, 0.2, 0.3, 0.7], 2)
  assert.deepEqual(hand.counts, [3, 1])
  assert.equal(hand.statistic, 1)
  assert.equal(hand.dof, 1)
  // E[chi^2] = k - 1 exactly; its variance is close to 2(k - 1), so the mean
  // of 2000 statistics has standard error about sqrt(30 / 2000) = 0.12.
  const rng = VM.sampling.seededRandom(2)
  let total = 0
  for (let r = 0; r < 2000; r++) {
    const us = []
    for (let i = 0; i < 400; i++) us.push(rng())
    total += chiSquareTest(us, 16).statistic
  }
  assert.ok(Math.abs(total / 2000 - 15) < 0.5, `mean ${total / 2000}`)
})

test('chiSquareTest: a full period of the small LCG fills every bin equally', () => {
  // Each of the 2^16 states appears once, so each of 16 bins gets 4096.
  const result = chiSquareTest(drawSample('lcg16', 1, 65536).us, 16)
  for (const count of result.counts) assert.equal(count, 4096)
  assert.equal(result.statistic, 0)
  assert.equal(result.lower, 0)
})

test('monobitTest and runsTest: the values the exercises derive', () => {
  // All ones: Z = (n - n/2) / sqrt(n/4) = sqrt(n), and a single run.
  const ones = new Array(100).fill(1)
  assert.ok(Math.abs(monobitTest(ones).z - 10) < 1e-12)
  assert.equal(countRuns(ones), 1)
  // Alternating: exactly half ones, n runs, Z = sqrt(n - 1).
  const alternating = []
  for (let i = 0; i < 10000; i++) alternating.push(i % 2)
  assert.equal(monobitTest(alternating).z, 0)
  assert.equal(runsTest(alternating).runs, 10000)
  assert.ok(Math.abs(runsTest(alternating).z - Math.sqrt(9999)) < 1e-9)
  // The page's example 0011100110 has 5 runs.
  assert.equal(countRuns([0, 0, 1, 1, 1, 0, 0, 1, 1, 0]), 5)
})

test('runsTest: mean (n + 1)/2 and variance (n - 1)/4 over many fair sequences', () => {
  const rng = VM.sampling.seededRandom(3)
  const n = 200, reps = 4000
  const runs = []
  for (let r = 0; r < reps; r++) {
    const bits = []
    for (let i = 0; i < n; i++) bits.push(rng() < 0.5 ? 0 : 1)
    runs.push(countRuns(bits))
  }
  const stats = VM.distributions.sampleStats(runs)
  // Standard error of the mean: sqrt(49.75 / 4000) = 0.11.
  assert.ok(Math.abs(stats.mean - (n + 1) / 2) < 0.45, `mean ${stats.mean}`)
  // The sample variance of 4000 near-normal values is within about 10%.
  assert.ok(Math.abs(stats.variance / ((n - 1) / 4) - 1) < 0.1, `variance ${stats.variance}`)
})

test('ksStatistic: the hand example, and brute force over a fine grid', () => {
  // i/n - u_(i) = 0.08, 0.17, 0.15, 0.13, 0.11 and u_(i) - (i-1)/n = 0.12,
  // 0.03, 0.05, 0.07, 0.09: the largest is 0.4 - 0.23.
  const hand = ksStatistic([0.23, 0.67, 0.12, 0.89, 0.45])
  assert.ok(Math.abs(hand.d - 0.17) < 1e-12)
  assert.equal(hand.at, 0.23)
  // sup |F_n(x) - x| over a grid of 200,001 points is within the grid step
  // of the exact maximum.
  const us = drawSample('mulberry32', 3, 20).us
  const exact = ksStatistic(us).d
  let brute = 0
  for (let j = 0; j <= 200000; j++) {
    const x = j / 200000
    let below = 0
    for (const u of us) {
      if (u <= x) below++
    }
    brute = Math.max(brute, Math.abs(below / 20 - x))
  }
  assert.ok(brute <= exact + 1e-12 && exact - brute < 1e-5, `exact ${exact}, brute ${brute}`)
})

test('kolmogorovTail: the 5% and 1% critical values, and the two series agree', () => {
  // One-term critical values sqrt(ln(2 / alpha) / 2) = 1.358 and 1.628; the
  // dropped terms are below 1e-6 there.
  assert.ok(Math.abs(kolmogorovTail(Math.sqrt(Math.log(40) / 2)) - 0.05) < 1e-5)
  assert.ok(Math.abs(kolmogorovTail(Math.sqrt(Math.log(200) / 2)) - 0.01) < 1e-6)
  assert.ok(Math.abs(kolmogorovTail(0.9999) - kolmogorovTail(1.0001)) < 1e-3)
  assert.equal(kolmogorovTail(0), 1)
  let previous = 1
  for (let z = 0.05; z < 3; z += 0.05) {
    const tail = kolmogorovTail(z)
    assert.ok(tail <= previous + 1e-12 && tail >= 0, `not decreasing at ${z}`)
    previous = tail
  }
})

test('ksTest: sqrt(n) D exceeds 1.36 about 5% of the time for uniform numbers', () => {
  const rng = VM.sampling.seededRandom(4)
  let rejections = 0
  const reps = 2000
  for (let r = 0; r < reps; r++) {
    const us = []
    for (let i = 0; i < 200; i++) us.push(rng())
    if (ksTest(us).pValue < 0.05) rejections++
  }
  // Binomial(2000, 0.05): mean 100, sd 9.7. The asymptotic distribution is
  // slightly conservative at n = 200, so allow 4 sd below and 3 above.
  assert.ok(rejections > 60 && rejections < 130, `rejections ${rejections}`)
})

test('testBattery: the readouts the exercises quote, with the page seed', () => {
  // mulberry32 passes all four at N = 1000.
  const good = testBattery('mulberry32', 1, 1000, 16, 'first')
  assert.ok(good.chi.statistic < 25.0 && good.chi.upper > 0.05)
  assert.ok(Math.abs(good.monobit.z) < 1.96 && Math.abs(good.runs.z) < 1.96 && good.ks.statistic < 1.36)
  // The exercise's RANDU first bit: Z = -2.21, a chance failure at seed 1.
  const randu = testBattery('randu', 1, 1000, 16, 'first')
  assert.equal(randu.monobit.z.toFixed(2), '-2.21')
  // RANDU's last bit is always 1: Z = sqrt(N).
  assert.ok(Math.abs(testBattery('randu', 1, 1000, 16, 'last').monobit.z - Math.sqrt(1000)) < 1e-9)
  // The small LCG's last bit alternates: monobit 0, runs sqrt(N - 1).
  const lcg = testBattery('lcg16', 1, 10000, 16, 'last')
  assert.equal(lcg.monobit.z, 0)
  assert.equal(lcg.runs.z.toFixed(2), '99.99')
})

test('blockPValues: uniform for mulberry32, 4 repeated values for the small LCG', () => {
  // 400 p-values of a perfect generator: the count below 0.05 is
  // Binomial(400, 0.05), mean 20 and sd 4.4; and a KS test of their
  // uniformity should pass.
  const good = blockPValues('mulberry32', 1, 4096, 16, 400)
  let below = 0
  for (const p of good) {
    if (p < 0.05) below++
  }
  assert.ok(below >= 8 && below <= 34, `below ${below}`)
  assert.ok(ksTest(good).pValue > 0.01)
  // 400 * 4096 numbers are 25 periods of the 2^16-state generator: the same
  // 16 blocks, 25 times each. And a^(2^14) = 1 (mod 2^16) for a = 1 (mod 4),
  // so x_{n + 2^14} = x_n + const, with const an odd multiple of 2^14: the
  // block four blocks later is the same block shifted by 1/4 or 3/4, which
  // rotates the 16 bins and leaves chi-squared unchanged. So only 4 values.
  const xs = lcgSequence(smallLcg.a, smallLcg.c, smallLcg.m, 1, 16385)
  assert.equal(((xs[16384] - xs[0]) % 65536 + 65536) % 16384, 0)
  assert.equal(new Set(blockPValues('lcg16', 1, 4096, 16, 400)).size, 4)
})
