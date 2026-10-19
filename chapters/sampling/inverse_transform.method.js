/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The triangular distribution from inverse_transform.qmd. Imported by the
// page's OJS cells and by inverse_transform.method.test.js. Pure; no DOM, no OJS.

// Triangular density on [a, b] with mode c.
export function triangularPdf(x, a, b, c) {
  if (a <= x && x < c) return 2 * (x - a) / ((b - a) * (c - a))
  if (c <= x && x <= b) return 2 * (b - x) / ((b - a) * (b - c))
  return 0
}
