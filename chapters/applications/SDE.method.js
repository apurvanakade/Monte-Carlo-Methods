/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The simulations behind SDE.qmd: Brownian paths, their endpoints, and
// geometric Brownian motion from its exact solution. Imported by the page's
// OJS cells and by SDE.method.test.js. Pure functions of numbers and a
// standard-normal source `gaussian` (e.g. VM.sampling.gaussianRandom of a
// VM.sampling.seededRandom); no DOM, no OJS.

// M Brownian paths on [0, T] with N steps each: W_0 = 0 and
// W_{n+1} = W_n + sqrt(dt) Z_n. Returns the times and one array per path.
export function wienerPaths(T, N, M, gaussian) {
  const dt = T / N
  const times = []
  for (let n = 0; n <= N; n++) times.push(n * dt)
  const paths = []
  for (let m = 0; m < M; m++) {
    const w = [0]
    for (let n = 0; n < N; n++) w.push(w[n] + Math.sqrt(dt) * gaussian())
    paths.push(w)
  }
  return {times, paths}
}

// W(T) at the end of `paths` simulated paths of `steps` steps each, for each
// horizon in `horizons`.
export function wienerEndpoints(horizons, steps, paths, gaussian) {
  const out = []
  for (const T of horizons) {
    const dt = T / steps
    const ends = []
    for (let m = 0; m < paths; m++) {
      let w = 0
      for (let n = 0; n < steps; n++) w += Math.sqrt(dt) * gaussian()
      ends.push(w)
    }
    out.push({T, ends})
  }
  return out
}

// M paths of geometric Brownian motion from the exact solution
// X(t) = X0 exp((mu - sigma^2 / 2) t + sigma W(t)), and their average at each
// time.
export function gbmPaths(mu, sigma, x0, T, N, M, gaussian) {
  const {times, paths} = wienerPaths(T, N, M, gaussian)
  const gbm = []
  for (const w of paths) {
    const x = []
    for (let n = 0; n < times.length; n++) x.push(x0 * Math.exp((mu - sigma * sigma / 2) * times[n] + sigma * w[n]))
    gbm.push(x)
  }
  const average = []
  for (let n = 0; n < times.length; n++) {
    let sum = 0
    for (const x of gbm) sum += x[n]
    average.push(sum / M)
  }
  return {times, paths: gbm, average}
}
