/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The methods behind chapters/random-numbers/index.qmd: linear congruential
// generators (their orbits, periods and lattices), RANDU, and the statistical
// tests the chapter runs on a generator's output. Imported by the page's OJS
// cells and by method.test.js. Pure functions of numbers; no DOM, no OJS. The
// library is read only as globalThis.VM (the chi-squared and normal CDFs, and
// mulberry32 as VM.sampling.seededRandom).

// ---------------------------------------------------------------------------
// Linear congruential generators
// ---------------------------------------------------------------------------

// (a * x) mod m without leaving the 53 bits a double holds exactly, for
// 0 <= a, x < m <= 2^32: a is split into its high and low 16 bits, so every
// product stays below 2^48.
export function mulMod(a, x, m) {
  const high = Math.floor(a / 65536)
  const low = a % 65536
  return ((high * x % m) * 65536 + low * x) % m
}

// One step of the generator x -> (a x + c) mod m.
export function lcgStep(x, a, c, m) {
  return (mulMod(a % m, x, m) + c) % m
}

// The states x_0 = seed mod m, x_1, ..., x_{n-1}.
export function lcgSequence(a, c, m, seed, n) {
  const xs = []
  let x = ((seed % m) + m) % m
  for (let i = 0; i < n; i++) {
    xs.push(x)
    x = lcgStep(x, a, c, m)
  }
  return xs
}

// The orbit of `seed`: the states in order until one repeats. `tail` is how
// many states come before the cycle (0 when a is coprime to m), `period` the
// length of the cycle, so states has tail + period entries. Stores one entry
// per residue, so m should be small (the page keeps it at most 4096).
export function lcgOrbit(a, c, m, seed) {
  const firstSeen = new Int32Array(m).fill(-1)
  const states = []
  let x = ((seed % m) + m) % m
  while (firstSeen[x] < 0) {
    firstSeen[x] = states.length
    states.push(x)
    x = lcgStep(x, a, c, m)
  }
  const tail = firstSeen[x]
  return {states, tail, period: states.length - tail}
}

export function gcd(a, b) {
  while (b !== 0) {
    const r = a % b
    a = b
    b = r
  }
  return a
}

// The distinct prime factors of m, by trial division.
export function primeFactors(m) {
  const primes = []
  let rest = m
  for (let p = 2; p * p <= rest; p++) {
    if (rest % p === 0) {
      primes.push(p)
      while (rest % p === 0) rest /= p
    }
  }
  if (rest > 1) primes.push(rest)
  return primes
}

// The three conditions of the Hull-Dobell theorem for x -> (a x + c) mod m,
// and whether all hold (so that every seed has period m).
export function hullDobell(a, c, m) {
  const coprime = gcd(((c % m) + m) % m, m) === 1
  let primes = true
  for (const p of primeFactors(m)) {
    if ((a - 1) % p !== 0) primes = false
  }
  let four = true
  if (m % 4 === 0 && (a - 1) % 4 !== 0) four = false
  return {coprime, primes, four, full: coprime && primes && four}
}

// The widest gap between adjacent parallel lines that together hold every
// pair (x_n, x_{n+1}) / m of the generator: the two-dimensional spectral
// test. The pairs lie on the lines s u + t v = integer whenever
// s + a t = 0 (mod m), spaced 1 / sqrt(s^2 + t^2) apart, so the widest gap
// comes from the shortest such (s, t). That vector is no longer than
// sqrt(2 m / sqrt 3), which bounds the search over t.
export function lineSpacing(a, m) {
  const limit = Math.ceil(Math.sqrt(2 * m / Math.sqrt(3))) + 1
  let shortest = m * m
  for (let t = 0; t <= limit; t++) {
    // s = -a t (mod m), taken in (-m / 2, m / 2].
    let s = (m - mulMod(a % m, t, m)) % m
    if (s > m / 2) s -= m
    if (s === 0 && t === 0) continue
    shortest = Math.min(shortest, s * s + t * t)
  }
  return 1 / Math.sqrt(shortest)
}

// The same in three dimensions: the triples (x_n, x_{n+1}, x_{n+2}) / m lie
// on the planes s u + t v + w z = integer whenever s + a t + a^2 w = 0
// (mod m). Returns the shortest such (s, t, w) with |t|, |w| <= reach, and the
// gap 1 / its length. A small reach is enough for a bad generator, which is
// what the page uses it for.
export function planeSpacing(a, m, reach) {
  const a2 = mulMod(a % m, a % m, m)
  let best = null
  let shortest = Infinity
  for (let t = -reach; t <= reach; t++) {
    for (let w = -reach; w <= reach; w++) {
      const tMod = ((t % m) + m) % m
      const wMod = ((w % m) + m) % m
      let s = (2 * m - mulMod(a % m, tMod, m) - mulMod(a2, wMod, m)) % m
      if (s > m / 2) s -= m
      if (s === 0 && t === 0 && w === 0) continue
      const length2 = s * s + t * t + w * w
      if (length2 < shortest) {
        shortest = length2
        best = [s, t, w]
      }
    }
  }
  return {normal: best, spacing: 1 / Math.sqrt(shortest)}
}

// ---------------------------------------------------------------------------
// The generators the page tests
// ---------------------------------------------------------------------------

// RANDU: x -> 65539 x mod 2^31, from an odd seed.
export const randuMultiplier = 65539
export const randuModulus = 2147483648

// A full-period generator with only 2^16 states, small enough that the page
// can run through all of them.
export const smallLcg = {a: 25173, c: 13849, m: 65536}

// The generators by name. Each is {label, m, start(seed)}: start returns a
// function giving the next integer in [0, m), so a test can read either the
// number x / m or single bits of x.
//   mulberry32  VM.sampling.seededRandom, the generator behind every figure in
//               these notes, as the 32-bit integer it divides by 2^32.
//   lcg16       smallLcg, started at seed mod 2^16.
//   randu       RANDU, started at the odd number 2 seed + 1.
export const generators = {
  mulberry32: {
    label: "mulberry32",
    m: 4294967296,
    start(seed) {
      const rng = globalThis.VM.sampling.seededRandom(seed)
      return () => Math.round(rng() * 4294967296)
    }
  },
  lcg16: {
    label: "LCG, m = 2¹⁶",
    m: smallLcg.m,
    start(seed) {
      let x = ((seed % smallLcg.m) + smallLcg.m) % smallLcg.m
      return () => {
        const out = x
        x = lcgStep(x, smallLcg.a, smallLcg.c, smallLcg.m)
        return out
      }
    }
  },
  randu: {
    label: "RANDU",
    m: randuModulus,
    start(seed) {
      let x = (2 * (((seed % 1073741824) + 1073741824) % 1073741824) + 1) % randuModulus
      return () => {
        const out = x
        x = mulMod(randuMultiplier, x, randuModulus)
        return out
      }
    }
  }
}

// n integers from the named generator, and what the tests read from them:
// us[i] = x_i / m, firstBits[i] the leading binary digit of us[i] (1 when
// us[i] >= 1/2), lastBits[i] the last binary digit of x_i.
export function drawSample(name, seed, n) {
  const generator = generators[name]
  const next = generator.start(seed)
  const xs = [], us = [], firstBits = [], lastBits = []
  for (let i = 0; i < n; i++) {
    const x = next()
    xs.push(x)
    us.push(x / generator.m)
    let first = 0
    if (2 * x >= generator.m) first = 1
    firstBits.push(first)
    lastBits.push(x % 2)
  }
  return {xs, us, firstBits, lastBits}
}

// n consecutive triples (u_i, u_{i+1}, u_{i+2}) of the named generator, each
// number used in three triples, and for each triple the combination
// 9 u_i - 6 u_{i+1} + u_{i+2}, which RANDU makes an integer.
export function consecutiveTriples(name, seed, n) {
  const us = drawSample(name, seed, n + 2).us
  const xs = [], ys = [], zs = [], planes = []
  for (let i = 0; i < n; i++) {
    xs.push(us[i])
    ys.push(us[i + 1])
    zs.push(us[i + 2])
    planes.push(9 * us[i] - 6 * us[i + 1] + us[i + 2])
  }
  return {xs, ys, zs, planes}
}

// The sample mean of cos(2 pi (9 u_i - 6 u_{i+1} + u_{i+2})) over n disjoint
// triples, with its estimated standard error. The integral it estimates is 0.
export function planeWaveEstimate(name, seed, n) {
  const us = drawSample(name, seed, 3 * n).us
  let sum = 0, sumSquares = 0
  for (let i = 0; i < n; i++) {
    const value = Math.cos(2 * Math.PI * (9 * us[3 * i] - 6 * us[3 * i + 1] + us[3 * i + 2]))
    sum += value
    sumSquares += value * value
  }
  const mean = sum / n
  const variance = Math.max(0, sumSquares / n - mean * mean)
  return {estimate: mean, stdError: Math.sqrt(variance / n)}
}

// bits[i][j] is binary digit j (0 the last) of x_i, for the first n states of
// x -> (a x + c) mod 2^width.
export function lcgBits(a, c, width, seed, n) {
  const xs = lcgSequence(a, c, 2 ** width, seed, n)
  const bits = []
  for (const x of xs) {
    const row = []
    for (let j = 0; j < width; j++) row.push(Math.floor(x / 2 ** j) % 2)
    bits.push(row)
  }
  return bits
}

// The period of a 0/1 sequence that is known to be periodic from its start:
// the smallest p with bits[i + p] = bits[i] throughout. The sequence must
// cover at least two periods, or a shorter p can match by accident.
export function sequencePeriod(bits) {
  for (let p = 1; p < bits.length; p++) {
    let matches = true
    for (let i = 0; i + p < bits.length; i++) {
      if (bits[i + p] !== bits[i]) {
        matches = false
        break
      }
    }
    if (matches) return p
  }
  return bits.length
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// The two tails of a statistic and the two-sided p-value, twice the smaller.
function twoSided(lower, upper) {
  return Math.min(1, 2 * Math.min(lower, upper))
}

// Pearson's chi-squared test that us is uniform on [0, 1): counts in k equal
// bins against the expected n / k. Under the hypothesis the statistic is
// about chi-squared with k - 1 degrees of freedom. upper is the probability
// of a statistic at least this large (a poor fit), lower of one at least this
// small (a fit too good to be random).
export function chiSquareTest(us, k) {
  const n = us.length
  const counts = new Array(k).fill(0)
  for (const u of us) counts[Math.min(k - 1, Math.floor(u * k))]++
  const expected = n / k
  let statistic = 0
  for (const count of counts) statistic += (count - expected) * (count - expected) / expected
  const lower = globalThis.VM.distributions.chiSquaredCdf(statistic, k - 1)
  return {counts, expected, statistic, dof: k - 1, lower, upper: 1 - lower, pValue: twoSided(lower, 1 - lower)}
}

// The monobit test: the number of ones among n fair bits is Binomial(n, 1/2),
// so z = (ones - n/2) / sqrt(n/4) is about standard normal.
export function monobitTest(bits) {
  const n = bits.length
  let ones = 0
  for (const bit of bits) ones += bit
  const z = (ones - n / 2) / Math.sqrt(n / 4)
  const lower = globalThis.VM.distributions.normalCdf(z)
  return {ones, z, pValue: twoSided(lower, 1 - lower)}
}

// The number of runs: maximal blocks of equal consecutive bits.
export function countRuns(bits) {
  let runs = 1
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] !== bits[i - 1]) runs++
  }
  return runs
}

// The runs test: among n fair independent bits the n - 1 change indicators
// are independent Bernoulli(1/2), so the number of runs R has mean
// 1 + (n - 1)/2 and variance (n - 1)/4, and z = (R - mean) / sd is about
// standard normal.
export function runsTest(bits) {
  const n = bits.length
  const runs = countRuns(bits)
  const z = (runs - 1 - (n - 1) / 2) / Math.sqrt((n - 1) / 4)
  const lower = globalThis.VM.distributions.normalCdf(z)
  return {runs, z, pValue: twoSided(lower, 1 - lower)}
}

// The Kolmogorov-Smirnov statistic against the uniform distribution: the
// largest gap D between the empirical CDF of us and F(x) = x. It is reached
// at a sample point, just before or just after the jump there; `at` is that
// point and `below`, `above` the two CDF values the gap spans.
export function ksStatistic(us) {
  const sorted = us.slice().sort((p, q) => p - q)
  const n = sorted.length
  let d = 0, at = 0, below = 0, above = 0
  for (let i = 0; i < n; i++) {
    const after = (i + 1) / n - sorted[i]
    const before = sorted[i] - i / n
    if (after > d) {
      d = after
      at = sorted[i]
      below = sorted[i]
      above = (i + 1) / n
    }
    if (before > d) {
      d = before
      at = sorted[i]
      below = i / n
      above = sorted[i]
    }
  }
  return {d, at, below, above, sorted}
}

// The Kolmogorov distribution's upper tail,
// P(K > z) = 2 sum_{j >= 1} (-1)^(j-1) exp(-2 j^2 z^2). The alternating
// series converges slowly for small z, so there the equivalent form
// P(K <= z) = (sqrt(2 pi) / z) sum_j exp(-(2j - 1)^2 pi^2 / (8 z^2)) is used.
export function kolmogorovTail(z) {
  if (z <= 0) return 1
  if (z < 1) {
    let total = 0
    for (let j = 1; j <= 20; j++) {
      total += Math.exp(-(2 * j - 1) * (2 * j - 1) * Math.PI * Math.PI / (8 * z * z))
    }
    return 1 - Math.sqrt(2 * Math.PI) / z * total
  }
  let total = 0
  for (let j = 1; j <= 100; j++) {
    let sign = 1
    if (j % 2 === 0) sign = -1
    total += sign * Math.exp(-2 * j * j * z * z)
  }
  return 2 * total
}

// The Kolmogorov-Smirnov test of uniformity: sqrt(n) D is about
// Kolmogorov-distributed, and a large value rejects.
export function ksTest(us) {
  const ks = ksStatistic(us)
  const statistic = Math.sqrt(us.length) * ks.d
  return {d: ks.d, statistic, pValue: kolmogorovTail(statistic)}
}

// The four tests the page's app runs on one sample: uniformity of the numbers
// (chi-squared in k bins, Kolmogorov-Smirnov) and the monobit and runs tests
// on the chosen bit ("first" or "last").
export function testBattery(name, seed, n, k, bit) {
  const sample = drawSample(name, seed, n)
  let bits = sample.firstBits
  if (bit === "last") bits = sample.lastBits
  return {
    chi: chiSquareTest(sample.us, k),
    ks: ksTest(sample.us),
    monobit: monobitTest(bits),
    runs: runsTest(bits)
  }
}

// The chi-squared test repeated on `blocks` consecutive blocks of n numbers
// from one stream: the upper-tail p-value of each block. From independent
// uniform numbers these p-values are themselves uniform on [0, 1].
export function blockPValues(name, seed, n, k, blocks) {
  const us = drawSample(name, seed, n * blocks).us
  const pValues = []
  for (let b = 0; b < blocks; b++) {
    pValues.push(chiSquareTest(us.slice(b * n, (b + 1) * n), k).upper)
  }
  return pValues
}
