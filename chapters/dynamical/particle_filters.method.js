/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The bootstrap particle filter behind particle_filters.qmd: a 2-D
// constant-velocity tracking model, the filter, and the 95% confidence
// ellipse of a position covariance. Imported by the page's OJS cells and by
// particle_filters.method.test.js. Pure functions of numbers and a random
// source `rng` (a function returning uniforms on [0, 1), e.g. from
// VM.sampling.seededRandom); the library is read as globalThis.VM; no DOM,
// no OJS.

// A constant-velocity model in 2-D: state [x, y, vx, vy]. The process noise
// is a random acceleration a ~ N(0, sigma_a^2) per axis, which moves the
// position by a dt^2/2 and the velocity by a dt. `gaussian` returns standard
// normals.
export function pfPropagate(state, dt, sigmaA, gaussian) {
  const ax = sigmaA * gaussian()
  const ay = sigmaA * gaussian()
  return [
    state[0] + dt * state[2] + ax * dt * dt / 2,
    state[1] + dt * state[3] + ay * dt * dt / 2,
    state[2] + ax * dt,
    state[3] + ay * dt
  ]
}

// Simulates the truth and the observations (the position plus
// N(0, sigma_r^2 I) noise), then runs the bootstrap particle filter:
// propagate, weight by the observation likelihood, resample (systematically)
// when the effective sample size falls below N/2. `model` is
// {dt, T, nParticles, sigmaA, sigmaR, start, initialVariances}.
export function runParticleFilter(rng, model) {
  const VM = globalThis.VM
  const m = model
  const gaussian = VM.sampling.gaussianRandom(rng)

  const truth = [m.start]
  const observations = []
  for (let t = 0; t < m.T; t++) {
    const next = pfPropagate(truth[t], m.dt, m.sigmaA, gaussian)
    truth.push(next)
    observations.push([next[0] + m.sigmaR * gaussian(), next[1] + m.sigmaR * gaussian()])
  }

  let particles = []
  for (let i = 0; i < m.nParticles; i++) {
    const p = []
    for (let k = 0; k < 4; k++) p.push(m.start[k] + Math.sqrt(m.initialVariances[k]) * gaussian())
    particles.push(p)
  }
  let weights = new Array(m.nParticles).fill(1 / m.nParticles)

  const estimates = [], positionCovs = [], ess = [], resampledSteps = []
  for (let t = 0; t < m.T; t++) {
    // Predict.
    for (let i = 0; i < m.nParticles; i++) particles[i] = pfPropagate(particles[i], m.dt, m.sigmaA, gaussian)
    // Update: w_i *= p(y_t | x_t^(i)); the Gaussian's constant cancels on normalizing.
    let total = 0
    for (let i = 0; i < m.nParticles; i++) {
      const dx = observations[t][0] - particles[i][0]
      const dy = observations[t][1] - particles[i][1]
      weights[i] *= Math.exp(-(dx * dx + dy * dy) / (2 * m.sigmaR * m.sigmaR))
      total += weights[i]
    }
    let sumSquares = 0
    for (let i = 0; i < m.nParticles; i++) {
      weights[i] /= total
      sumSquares += weights[i] * weights[i]
    }
    // Weighted mean and position covariance, before any resampling.
    const mean = [0, 0, 0, 0]
    for (let i = 0; i < m.nParticles; i++) {
      for (let k = 0; k < 4; k++) mean[k] += weights[i] * particles[i][k]
    }
    let cxx = 0, cxy = 0, cyy = 0
    for (let i = 0; i < m.nParticles; i++) {
      const dx = particles[i][0] - mean[0]
      const dy = particles[i][1] - mean[1]
      cxx += weights[i] * dx * dx
      cxy += weights[i] * dx * dy
      cyy += weights[i] * dy * dy
    }
    estimates.push(mean)
    positionCovs.push([cxx, cxy, cyy])
    // Resample when the effective sample size 1 / sum w^2 drops below N/2.
    const nEff = 1 / sumSquares
    ess.push(nEff)
    if (nEff < m.nParticles / 2) {
      const indices = VM.filters.systematicResample(weights, rng())
      const resampled = []
      for (const j of indices) resampled.push(particles[j].slice())
      particles = resampled
      weights = new Array(m.nParticles).fill(1 / m.nParticles)
      resampledSteps.push(t)
    }
  }

  const errors = []
  for (let t = 0; t < m.T; t++) {
    const dx = estimates[t][0] - truth[t + 1][0]
    const dy = estimates[t][1] - truth[t + 1][1]
    errors.push(Math.sqrt(dx * dx + dy * dy))
  }
  return {truth, observations, estimates, positionCovs, ess, resampledSteps, errors}
}

// The 95% confidence ellipse of a 2 x 2 covariance [[a, b], [b, c]] given as
// cov = [a, b, c]: the eigen-decomposition in closed form, scaled by the
// chi-squared(2) quantile.
export function pfEllipse(center, cov) {
  const [a, b, c] = cov
  const scale = globalThis.VM.distributions.chiSquaredQuantile(0.95, 2)
  const half = (a + c) / 2
  const radius = Math.sqrt(((a - c) / 2) * ((a - c) / 2) + b * b)
  const major = Math.sqrt(scale * (half + radius))
  const minor = Math.sqrt(scale * Math.max(half - radius, 0))
  const theta = 0.5 * Math.atan2(2 * b, a - c)
  const xs = [], ys = []
  for (let k = 0; k <= 60; k++) {
    const s = 2 * Math.PI * k / 60
    const u = major * Math.cos(s), v = minor * Math.sin(s)
    xs.push(center[0] + u * Math.cos(theta) - v * Math.sin(theta))
    ys.push(center[1] + u * Math.sin(theta) + v * Math.cos(theta))
  }
  return {xs, ys}
}
