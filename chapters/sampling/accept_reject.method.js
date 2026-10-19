/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The samplers behind accept_reject.qmd: the triangular target on [0, 1],
// accept-reject with a uniform box proposal and with a Beta(2, 2) proposal.
// Imported by the page's OJS cells and by accept_reject.method.test.js. Pure
// functions of numbers and a random source `rng` (uniforms on [0, 1), e.g.
// from VM.sampling.seededRandom); no DOM, no OJS.

// The target: the triangular density on [0, 1] with its peak at 1/2.
export function arTarget(x) {
  if (x < 0 || x > 1) return 0
  if (x < 0.5) return 4 * x
  return 4 * (1 - x)
}

// The Beta(2, 2) proposal density.
export function arBeta(x) {
  if (x < 0 || x > 1) return 0
  return 6 * x * (1 - x)
}

// Uniform proposals on the box [0, 1] x [0, M]; a point is accepted when it
// lies under the target density.
export function drawBoxProposals(rng, n, M) {
  const xs = [], ys = [], accepted = []
  for (let i = 0; i < n; i++) {
    const x = rng()
    const y = M * rng()
    xs.push(x)
    ys.push(y)
    accepted.push(y < arTarget(x))
  }
  return {M, xs, ys, accepted}
}

// Proposals x ~ Beta(2, 2), then y uniform on [0, M g(x)].
export function drawBetaProposals(rng, n, M) {
  const xs = [], ys = [], accepted = []
  for (let i = 0; i < n; i++) {
    // The median of three uniforms is Beta(2, 2).
    const u = [rng(), rng(), rng()].sort((a, b) => a - b)
    const x = u[1]
    const y = M * arBeta(x) * rng()
    xs.push(x)
    ys.push(y)
    accepted.push(y < arTarget(x))
  }
  return {M, xs, ys, accepted}
}

// Fraction of proposals accepted.
export function arEfficiency(sample) {
  let count = 0
  for (const a of sample.accepted) {
    if (a) count++
  }
  return count / sample.xs.length
}
