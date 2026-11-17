/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The simulations behind variance_reduction.qmd: importance sampling for a
// Gaussian tail, a control variate, antithetic variates and common random
// numbers on M/M/1 queues. Imported by the page's OJS cells and by
// method.test.js. Functions of numbers and a random source
// `rng` (a function returning uniforms on [0, 1), e.g. from
// VM.sampling.seededRandom); the library is read as globalThis.VM; no DOM, no
// OJS.

// Running average of an array: out[i] = mean of values[0..i].
export function runningAverage(values) {
  const out = []
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    out.push(sum / (i + 1))
  }
  return out
}

// Estimate P(X > 2) for X ~ N(0, 1) with N samples each way. Importance
// sampling: Y = 2 + Exp(1), weight phi(Y) / q(Y) with q(y) = exp(-(y - 2)).
// Every Y is above 2, so the indicator is always 1. Crude: indicators of
// N(0, 1) draws. Both draw from the same `rng`, interleaved.
export function importanceTailEstimate(rng, N) {
  const VM = globalThis.VM
  const proposal = VM.sampling.exponentialRandom(rng, 1)
  const gaussian = VM.sampling.gaussianRandom(rng)
  const weighted = [], crude = []
  for (let i = 0; i < N; i++) {
    const y = 2 + proposal()
    weighted.push(VM.distributions.normalPdf(y, 0, 1) / Math.exp(-(y - 2)))
    let hit = 0
    if (gaussian() > 2) hit = 1
    crude.push(hit)
  }
  return {
    N,
    trueValue: 1 - VM.distributions.normalCdf(2),
    weighted, crude,
    isStats: VM.distributions.sampleStats(weighted, {ddof: 0}),
    crudeStats: VM.distributions.sampleStats(crude, {ddof: 0})
  }
}

// Estimate the integral of f(x) = x e^{-x} over [0, 1] (exactly 1 - 2/e) with
// the control h(x) = x, E[h(X)] = 1/2, from N uniforms. beta* = Cov(f, h) /
// Var(h) is estimated from the first `pilot` samples. `tested` holds the
// estimators for 0, 0.2, the estimated beta*, 0.5 and 0.7 sorted by beta;
// `curve` the estimator at 100 betas from -0.5 to 1.
export function controlVariateStudy(rng, N, pilot) {
  const VM = globalThis.VM
  const h0 = 0.5
  const xs = [], fs = []
  for (let i = 0; i < N; i++) {
    const x = rng()
    xs.push(x)
    fs.push(x * Math.exp(-x))
  }
  const fPilot = VM.distributions.sampleStats(fs.slice(0, pilot))
  const hPilot = VM.distributions.sampleStats(xs.slice(0, pilot))
  let cov = 0
  for (let i = 0; i < pilot; i++) cov += (fs[i] - fPilot.mean) * (xs[i] - hPilot.mean)
  cov /= pilot - 1
  const betaEst = cov / hPilot.variance

  // The control-variate samples f(X) - beta (h(X) - h0) for one beta.
  function samplesFor(beta) {
    const out = []
    for (let i = 0; i < N; i++) out.push(fs[i] - beta * (xs[i] - h0))
    return out
  }
  function estimatorFor(beta) {
    const stats = VM.distributions.sampleStats(samplesFor(beta), {ddof: 0})
    return {beta, estimate: stats.mean, variance: stats.variance / N}
  }

  const tested = []
  for (const beta of [0, 0.2, betaEst, 0.5, 0.7]) tested.push(estimatorFor(beta))
  tested.sort((a, b) => a.beta - b.beta)
  const curve = []
  for (let i = 0; i < 100; i++) curve.push(estimatorFor(-0.5 + 1.5 * i / 99))
  return {N, h0, betaEst, tested, curve, standard: estimatorFor(0), trueValue: 1 - 2 / Math.E,
    runningStandard: runningAverage(fs), runningControl: runningAverage(samplesFor(betaEst))}
}

// Estimate the integral of f(x) = 1 / (1 + x^2) over [0, 1] (exactly pi/4):
// N independent uniforms, against N/2 antithetic pairs (U, 1 - U).
export function antitheticStudy(rng, N) {
  const VM = globalThis.VM
  const f = x => 1 / (1 + x * x)
  const standard = []
  for (let i = 0; i < N; i++) standard.push(f(rng()))
  const pairs = []
  for (let i = 0; i < N / 2; i++) {
    const u = rng()
    pairs.push((f(u) + f(1 - u)) / 2)
  }
  const standardStats = VM.distributions.sampleStats(standard, {ddof: 0})
  const pairStats = VM.distributions.sampleStats(pairs, {ddof: 0})
  return {
    N, trueValue: Math.PI / 4,
    standard: {estimate: standardStats.mean, variance: standardStats.variance / N},
    antithetic: {estimate: pairStats.mean, variance: pairStats.variance / (N / 2)},
    // Running averages over N/2 steps: the first N/2 standard samples, and the pairs.
    runningStandard: runningAverage(standard.slice(0, N / 2)),
    runningAntithetic: runningAverage(pairs)
  }
}

// Waiting times in queue of an M/M/1 queue that starts empty, by the Lindley
// recursion W_i = max(0, D_{i-1} - A_i). Inter-arrival times and service
// requirements are given; service time = requirement / rate.
export function mm1WaitingTimes(interArrivals, requirements, serviceRate) {
  const waits = []
  let arrival = 0
  let previousDeparture = 0
  for (let i = 0; i < interArrivals.length; i++) {
    arrival += interArrivals[i]
    let wait = 0
    if (i > 0) wait = Math.max(0, previousDeparture - arrival)
    waits.push(wait)
    previousDeparture = arrival + wait + requirements[i] / serviceRate
  }
  return waits
}

// n draws from a zero-argument sampler.
export function drawMany(draw, n) {
  const out = []
  for (let i = 0; i < n; i++) out.push(draw())
  return out
}

function mean(values) {
  return globalThis.VM.distributions.sampleStats(values).mean
}

// `replications` runs of `nCustomers` customers: the difference in mean
// waiting time between service rates mu1 and mu2, with common random numbers
// (both systems see the same arrivals and requirements) and with independent
// ones. Arrival rate lambda, rate-1 exponential inputs. `theory` is the
// steady-state mean wait in queue lambda / (mu (mu - lambda)) of each system.
export function crnStudy(rng, nCustomers, replications, lambda, mu1, mu2) {
  const VM = globalThis.VM
  const draw = VM.sampling.exponentialRandom(rng, 1)
  const crn = [], independent = []
  for (let rep = 0; rep < replications; rep++) {
    const arrivals = drawMany(draw, nCustomers)
    const requirements = drawMany(draw, nCustomers)
    const wait1 = mean(mm1WaitingTimes(arrivals, requirements, mu1))
    crn.push(wait1 - mean(mm1WaitingTimes(arrivals, requirements, mu2)))
    const arrivals2 = drawMany(draw, nCustomers)
    const requirements2 = drawMany(draw, nCustomers)
    independent.push(wait1 - mean(mm1WaitingTimes(arrivals2, requirements2, mu2)))
  }
  const theory = [lambda / (mu1 * (mu1 - lambda)), lambda / (mu2 * (mu2 - lambda))]
  return {replications, theory, crn: VM.distributions.sampleStats(crn, {ddof: 0}), independent: VM.distributions.sampleStats(independent, {ddof: 0})}
}

// One run of 50 customers through both systems with common random numbers
// (wait1, wait2), and a second run of 100 for the correlation between the two
// systems' waiting times and the least-squares line of system 2 on system 1.
export function crnDemoStudy(rng, mu1, mu2) {
  const VM = globalThis.VM
  const draw = VM.sampling.exponentialRandom(rng, 1)
  const arrivals = drawMany(draw, 50)
  const requirements = drawMany(draw, 50)
  const arrivalsDemo = drawMany(draw, 100)
  const requirementsDemo = drawMany(draw, 100)
  const demo1 = mm1WaitingTimes(arrivalsDemo, requirementsDemo, mu1)
  const demo2 = mm1WaitingTimes(arrivalsDemo, requirementsDemo, mu2)
  const s1 = VM.distributions.sampleStats(demo1)
  const s2 = VM.distributions.sampleStats(demo2)
  let cov = 0
  for (let i = 0; i < demo1.length; i++) cov += (demo1[i] - s1.mean) * (demo2[i] - s2.mean)
  cov /= demo1.length - 1
  const points = []
  for (let i = 0; i < demo1.length; i++) points.push({x: demo1[i], y: demo2[i]})
  return {
    wait1: mm1WaitingTimes(arrivals, requirements, mu1),
    wait2: mm1WaitingTimes(arrivals, requirements, mu2),
    demo1, demo2,
    correlation: cov / (s1.sd * s2.sd),
    fit: VM.numerical.linearRegression(points)
  }
}
