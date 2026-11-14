/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The densities plotted in other_distributions.qmd: a two-component normal
// mixture and the linear combination of the same two normals. Imported by the
// page's OJS cells and by method.test.js. Reads the
// library as globalThis.VM; no DOM, no OJS.

// X ~ N(mu1, sd1^2) and Y ~ N(mu2, sd2^2), weights w1 and w2, on [lo, hi].
// The mixture density is w1 f_X + w2 f_Y; the linear combination w1 X + w2 Y
// is normal with mean w1 mu1 + w2 mu2 and variance w1^2 sd1^2 + w2^2 sd2^2.
export function mixtureCurves(w1, w2, mu1, sd1, mu2, sd2, lo, hi, steps) {
  const VM = globalThis.VM
  const combMean = w1 * mu1 + w2 * mu2
  const combVar = w1 * w1 * sd1 * sd1 + w2 * w2 * sd2 * sd2
  const xs = [], mixture = [], combination = []
  for (let i = 0; i <= steps; i++) {
    const x = lo + (hi - lo) * i / steps
    xs.push(x)
    mixture.push(w1 * VM.distributions.normalPdf(x, mu1, sd1 * sd1) + w2 * VM.distributions.normalPdf(x, mu2, sd2 * sd2))
    combination.push(VM.distributions.normalPdf(x, combMean, combVar))
  }
  return {xs, mixture, combination, combMean, combVar}
}
