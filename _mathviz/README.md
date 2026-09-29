<!--
Copyright (c) 2026 Apurva Nakade. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Apurva Nakade
-->

# mathviz-local

Functions and CSS this site adds to [mathviz](https://github.com/apurvanakade/mathviz),
kept here until they move upstream. The layout is mathviz's own, path for
path, so porting is a file copy:

```
src/manifest.mjs     load order (entries go into mathviz's src/manifest.mjs)
src/js/<category>/   one VM.<category>.<fn> per file, IIFE extending window.VM, test alongside
src/css/             stylesheets (into mathviz's src/css/ + its css manifest)
scripts/build.mjs    concatenates src/ into ../_extensions/mathviz-local/dist/
scripts/load-vm.mjs  test loader: the installed mathviz bundle, then src/js in manifest order
```

`../_extensions/mathviz-local/` is a tiny Quarto extension whose filter adds
the built bundle to every page after mathviz's (`filters: [mathviz,
mathviz-local]` in `_quarto.yml`), so these functions extend the same `VM`.

```sh
make test            # node --test over src/**/*.test.js
make mathviz-local   # rebuild dist/ after editing src/ (commit both)
```

## What's here

| Member | File | Used by |
|---|---|---|
| `VM.mcmc.autocorrelation` | `mcmc/autocorrelation.js` | MH, Gibbs diagnostics |
| `VM.mcmc.effectiveSampleSize` | `mcmc/effective-sample-size.js` | MH, Gibbs |
| `VM.mcmc.runningMean` | `mcmc/running-mean.js` | MH diagnostics |
| `VM.mcmc.randomWalkMetropolis` | `mcmc/random-walk-metropolis.js` | MH chapter (both apps) |
| `VM.mcmc.gibbsBivariateNormal` | `mcmc/gibbs-bivariate-normal.js` | Gibbs chapter |
| `VM.mcmc.evolveDistribution` | `mcmc/evolve-distribution.js` | Markov chains appendix |
| `VM.mcmc.totalVariation` | `mcmc/total-variation.js` | Markov chains appendix |
| `VM.discreteMath.randomWalkMatrix` | `discrete-math/random-walk-matrix.js` | Markov chains appendix |
| `VM.discreteMath.springLayout` | `discrete-math/spring-layout.js` | Markov chains appendix |
| `VM.numerical.symmetricEigenvalues` | `numerical/symmetric-eigenvalues.js` | Markov chains appendix |
| `VM.plotting.persistentPlot` | `plotting/persistent-plot.js` | every app |
| `VM.ui.statRow` (+ `css/stat-row.css`) | `ui/stat-row.js` | every app |
| `VM.ui.urlParam`, `VM.ui.syncUrlParams` | `ui/url-params.js` | every app |

`mcmc` is a new category; the rest extend existing ones.

## Porting to mathviz

Per mathviz's CLAUDE.md, library code is authored in VisualMathLab's
`_mathviz/` and mirrored out, so:

1. Copy `src/js/**` and `src/css/**` into VisualMathLab's `_mathviz/src/`
   (same paths) and add the entries to its `src/manifest.mjs`.
   `effective-sample-size.js` must load after `autocorrelation.js`;
   `spring-layout.js` calls `VM.sampling.seededRandom` at call time only.
2. Tests: swap the import to that repo's `scripts/load-vm.mjs` (same
   relative path, `../../../scripts/load-vm.mjs`, so no edit is needed).
3. In mathviz: reference entries in `docs/reference/` (a new `mcmc.qmd`,
   plus the `pageFor` map in `scripts/docs-coverage.test.js`), and
   `.vm-stat-row`/`.vm-stat*` in `markup.qmd` for the CSS coverage test.
4. Once a mathviz release carries them, delete `_mathviz/` and
   `_extensions/mathviz-local/` here and drop `mathviz-local` from
   `_quarto.yml`'s filters.
