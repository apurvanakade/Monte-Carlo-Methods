/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The Kolmogorov density plotted in rng.qmd. Imported by the page's OJS cells
// and by rng.method.test.js. Pure; no DOM, no OJS.

// Density of the Kolmogorov distribution, the derivative of K(z). The
// alternating series converges slowly for small z, so there we differentiate
// the equivalent form K(z) = (sqrt(2 pi) / z) sum_j
// exp(-(2j - 1)^2 pi^2 / (8 z^2)) instead.
export function kolmogorovPdf(z) {
  let total = 0
  if (z < 1) {
    for (let j = 1; j <= 20; j++) {
      const a = (2 * j - 1) * (2 * j - 1) * Math.PI * Math.PI / 8
      total += Math.exp(-a / (z * z)) * (2 * a / Math.pow(z, 4) - 1 / (z * z))
    }
    return Math.sqrt(2 * Math.PI) * total
  }
  for (let j = 1; j <= 100; j++) {
    let sign = 1
    if (j % 2 === 0) sign = -1
    total += sign * j * j * Math.exp(-2 * j * j * z * z)
  }
  return 8 * z * total
}
