/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Load order for the functions this site adds to mathviz, for both
// scripts/build.mjs and scripts/load-vm.mjs. Same shape as mathviz's own
// src/manifest.mjs: when these move upstream, each entry goes into that
// file's `js`/`css` list (anything that reads another file at load time
// after it) and the file moves to the same path under mathviz's src/.
//
// Everything here runs after mathviz's own bundle, so any VM.* function
// mathviz ships (VM.sampling.seededRandom, VM.plotting.config, ...) is
// already defined.

export const js = [
  'mcmc/autocorrelation.js',
  'mcmc/effective-sample-size.js',
  'mcmc/running-mean.js',
  'mcmc/random-walk-metropolis.js',
  'mcmc/gibbs-bivariate-normal.js',
  'mcmc/evolve-distribution.js',
  'mcmc/total-variation.js',
  'discrete-math/random-walk-matrix.js',
  'discrete-math/spring-layout.js',
  'numerical/symmetric-eigenvalues.js',
  'plotting/persistent-plot.js',
  'ui/stat-row.js',
  'ui/url-params.js',
]

export const css = [
  'stat-row.css',
]
