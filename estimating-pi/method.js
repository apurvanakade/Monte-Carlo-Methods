/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The simulations behind estimating_pi.qmd: the unit-square hit-or-miss
// estimate of pi and Buffon's needle. Imported by the page's OJS cells and by
// method.test.js. Pure functions of numbers and a random
// source `rng` (a function returning uniforms on [0, 1), e.g. from
// VM.sampling.seededRandom); no DOM, no OJS.

// Throws `n` points uniformly in the square [-1, 1]^2. insideCount[i] counts
// the hits in the unit disk among the first i points.
export function dropPoints(rng, n) {
  const xs = [], ys = [], inside = [], insideCount = [0]
  for (let i = 0; i < n; i++) {
    const x = 2 * rng() - 1
    const y = 2 * rng() - 1
    const hit = x * x + y * y <= 1
    xs.push(x)
    ys.push(y)
    inside.push(hit)
    let count = insideCount[i]
    if (hit) count++
    insideCount.push(count)
  }
  return {xs, ys, inside, insideCount}
}

// The estimate 4 * inside / n and its estimated standard error
// 4 * sqrt(p (1 - p) / n), p = inside / n.
export function circleEstimate(inside, n) {
  const p = inside / n
  const estimate = 4 * p
  const stdError = 4 * Math.sqrt(p * (1 - p) / n)
  return {n, inside, estimate, stdError, error: Math.abs(estimate - Math.PI)}
}

// One independent estimate per sample size 100, 200, ..., maxN, each with its
// theoretical 95% interval estimate +- z sqrt(pi (4 - pi) / n).
export function circleConvergence(rng, maxN, z) {
  const sizes = [], estimates = [], lower = [], upper = [], widths = []
  for (let n = 100; n <= maxN; n += 100) {
    let inside = 0
    for (let i = 0; i < n; i++) {
      const x = 2 * rng() - 1
      const y = 2 * rng() - 1
      if (x * x + y * y <= 1) inside++
    }
    const estimate = 4 * inside / n
    const margin = z * Math.sqrt(Math.PI * (4 - Math.PI) / n)
    sizes.push(n)
    estimates.push(estimate)
    lower.push(estimate - margin)
    upper.push(estimate + margin)
    widths.push(2 * margin)
  }
  return {sizes, estimates, lower, upper, widths}
}

// Each needle's center (uniform on a width x height board) and angle
// (uniform on [0, pi)).
export function dropNeedles(rng, n, width, height) {
  const cx = [], cy = [], theta = []
  for (let i = 0; i < n; i++) {
    cx.push(width * rng())
    cy.push(height * rng())
    theta.push(Math.PI * rng())
  }
  return {cx, cy, theta}
}

// Endpoints and crossings of needles of the given length over lines spaced
// `spacing` apart. A line lies between the ends exactly when they fall in
// different strips. crossingCount[i] counts the crossings among the first i.
export function needleCrossings(drops, length, spacing) {
  const half = length / 2
  const n = drops.theta.length
  const x1 = [], y1 = [], x2 = [], y2 = [], crosses = [], crossingCount = [0]
  for (let i = 0; i < n; i++) {
    const dx = half * Math.cos(drops.theta[i])
    const dy = half * Math.sin(drops.theta[i])
    const ya = drops.cy[i] - dy
    const yb = drops.cy[i] + dy
    x1.push(drops.cx[i] - dx)
    x2.push(drops.cx[i] + dx)
    y1.push(ya)
    y2.push(yb)
    const hit = Math.floor(ya / spacing) !== Math.floor(yb / spacing)
    crosses.push(hit)
    let count = crossingCount[i]
    if (hit) count++
    crossingCount.push(count)
  }
  return {x1, y1, x2, y2, crosses, crossingCount}
}

// Buffon's estimator 2 l n / (t C) and its delta-method standard error
// (2 l / t) sqrt((1 - p) / (n p^3)), p = C / n. Undefined before the first
// crossing.
export function buffonEstimate(crossings, n, length, spacing) {
  if (crossings === 0) return {n, crossings, estimate: null, stdError: null, error: null}
  const p = crossings / n
  const estimate = (2 * length * n) / (spacing * crossings)
  const stdError = (2 * length / spacing) * Math.sqrt((1 - p) / (n * p * p * p))
  return {n, crossings, estimate, stdError, error: Math.abs(estimate - Math.PI)}
}
