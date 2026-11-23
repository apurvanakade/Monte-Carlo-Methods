# Rewriting a chapter: the procedure

How to take an old-style chapter to the new style, step by step. `chapter-guide.md` says what a finished chapter looks like (readers, exercises, tricks, structure, prose); `CLAUDE.md` has the mechanics (OJS, `method.js`, figures, apps). This file is the order of work, and what went wrong the first time.

Status: a draft, written from the rewrite of `chapters/estimating-integrals/` and updated as that chapter is revised. The log at the end records what was done there.

## 1. Read before planning

- `chapter-guide.md`, then the model chapter `chapters/estimating-pi/index.qmd` in full, with its `method.js`.
- The chapter being rewritten: `index.qmd`, `method.js`, `method.test.js`, and any `<!-- TODO -->` comments in it. A TODO is a request from the author; carry it out or say why not.
- Its neighbors:
  - the last line of the previous chapter, which promises what this one does;
  - the next page in `_quarto.yml`'s sidebar, for the closing link;
  - any later chapter that covers a topic this one touches (e.g. `variance-reduction/` for importance sampling). Link to it; don't teach it here.
- mathviz's docs for whatever the apps will use (`docs/markup.qmd` for layout, `docs/reference/*.qmd` for `VM.*` calls). Check there before inventing a helper.

## 2. Plan the content

Decide these before writing anything:

- **The governing principle**, one sentence, for a callout. For integrals: an integral is a volume times an expectation. Put the callout where the principle is first used (the section that introduces the chapter's new method), not in the introduction, when earlier sections come before that method.
- **The opening question**: concrete, with a number in it, and answered by the chapter.
- **What the old chapter claimed.** List its statements and check each one. Old chapters contain claims that are loose or wrong (the old integrals chapter said Monte Carlo's performance "doesn't degrade with dimension"; only the rate doesn't). A wrong claim usually marks the place where the real mathematics is: turn it into a section.
- **The tricks.** Look for the non-linear or subtle twist the guide asks for. Places to look:
  - two estimators of the same quantity, compared exactly (hit-or-miss against the sample mean, by conditioning);
  - a statement that is true of the rate and false of the constant;
  - a product or other structure that makes a hard quantity computable in closed form (the variance of a product integrand is $\beta^d - \alpha^{2d}$);
  - an identity behind an inequality (Koksma's inequality is one integration by parts);
  - the failure case, where the method returns a confident wrong answer (zero hits, estimated standard error zero).
- **One thread.** Find an idea that recurs and name it once in a callout ("Integrate out what you can"), then point back to it from later sections and from other chapters' examples.
- **The order of the sections.** Start from what the reader already has, and let each section's failure motivate the next:
  - first the deterministic method they know from a numerical analysis course, and the problem that breaks it (for integrals: a grid, and the curse of dimensionality, worked as an exercise on the opening question's numbers);
  - then the direct generalization of the previous chapter's method (hit or miss generalizes the circle estimator), with where it in turn fails;
  - only then the chapter's new method (the sample mean), introduced as the fix.

  Don't open with the new method and add the comparisons afterwards.
- **Sections**, each as: model, exercises, confirmed result, app or figure. For each section write down the one result later sections need; that is what the "You should find …" sentence states.
- **Apps and figures.** An app where the reader does something that produces a number an exercise asks for. A figure for every rate claimed. A figure whose parameter matters (dimension, length) gets a slider.
- **Theorems.** What is beyond the readers is stated with a citation and then explored: list those and their sources.

## 3. Methods and numbers first

Write `method.js` and compute every number the prose will quote **before** writing the prose.

- Put each sampler, estimator, rule and error study in `method.js` as plain functions of numbers and a seeded `rng`.
- Write a throwaway script next to it that imports `../../scripts/load-vm.mjs` and `./method.js` and prints:
  - every closed-form number an exercise's answer or a "You should find" will state;
  - every simulated number a figure's readout will show, with the page's seeds;
  - the fitted order of every curve;
  - the time each study takes (a figure that re-simulates on a slider should take well under 200 ms).

  Delete the script when done.
- Use what it shows. If the simulation disagrees with the planned prose, the prose changes. If a comparison comes out the other way from expected (in two dimensions a grid has about the same star discrepancy as random points), that is usually worth an exercise.
- Then write `method.test.js`: fixed seeds, and for each assertion a comment saying why the number is right (a closed form, a known limit, a brute-force check of a clever algorithm).

## 4. Write the page

In this order: setup cell and helpers, then section by section.

- Exercises carry the derivations; the prose after one states only the result. Every "You should find" number comes from step 3.
- An exercise part that sends the reader to an app names the control and the value to set.
- A table or readout must not print the answer to the exercise beside it. Give the inputs (the fraction $p_d$), not the result (the sample size).
- End with the Summary bullets, the link to the next page, and `## References` if anything is cited. New `references.bib` entries are written from memory unless looked up: say so when reporting.

Patterns that worked:

- **One app per estimator, in the section that defines it.** A method selector made the reader set a control ("leave *Method* on …") before the second method existed. Two apps share the integrand list, and an exercise that compares them names both.
- **A slider for the method's free parameter** (the box height $c$ of hit or miss) with the same seed across its values, so the same points move and only the parameter's effect changes the readout.
- **A slider-driven figure** keeps fixed axes (set both domains, clip the marks), so only the curves move, and reads its slider through a 300 ms pause.
- **Random against deterministic on one chart**: a random method is its RMS error with a band over many runs; a deterministic one is unjoined dots with its fitted line. The fitted orders go in a `statRow` under the chart, and the exercise asks the reader to compare them with the derived rate.
- **A draggable point** (`VM.plotting.draggablePoints`) when the definition being taught is a supremum over positions (the box in the star discrepancy): the reader moves the box, the readout gives the local value and the supremum.
- **A product integrand** makes a grid in $d$ dimensions free to evaluate (the grid sum is a one-dimensional sum to the power $d$), so the curse of dimensionality can be drawn out to $10^6$ points.

## 5. Check

- `node --test chapters/<slug>/` passes.
- Load the page in a headless browser and collect: uncaught errors, `.observablehq--error` cells, the text of every `.vm-stat-row`. Compare the readouts with the numbers from step 3.
- Screenshot each app and figure and look at them, at desktop width and at 400 px.
- Dark mode: emulating `prefers-color-scheme` does not switch the site's theme. Call `window.quartoToggleColorScheme()` in the page, then screenshot.
- Drive the controls once: every selector option, each slider at both ends.
- The two 404s from `giscus.app` on a local preview are expected (no discussion exists for the page yet).

## Things that went wrong

- **The prose read like a manual.** The first draft was terse: short declarative sentences, colons, aphorisms, no "we". The author's pages are inviting, the way a textbook is written. Before writing prose, reread a few paragraphs of the model chapter for the voice, and follow the Prose section of `chapter-guide.md`. Keep the structure (question, app, exercises, explanation, examples); only the sentences change.
- **Cross-page `@exr-…` references don't resolve** on a website. Link instead: `[the standard-error exercise](../estimating-pi/#exr-pi-variance)`. The render prints "Unable to resolve crossref" for each one.
- **`statRow` labels truncate** at about 20 characters, and a fifth tile wraps to its own row. Keep labels short, put the definition in `title`, and keep to four tiles.
- **A safety cap in a study function** (stop the grid at 400 cells per axis) silently cut a curve short in another dimension. Check each slider value's figure, not only the default.
- **A discrete estimator's lower quantile can be zero**, which a log axis can't show: clamp a band's lower edge to the axis floor.
- **The analysis-figure helpers are copied per page** (`piFigure`, `intFigure`, the log axis, the error figure). A third chapter that needs them should prompt moving them into mathviz instead of a third copy.

## Log: `chapters/estimating-integrals/`

Before: 350 lines. Statements of unbiasedness and variance, one smooth-against-oscillatory Plotly example, a weak derivative bound with its proof, one multidimensional example, a pros-and-cons callout. No exercises, no apps.

After:

- **Grids and the curse of dimensionality**: the midpoint rule's error by Taylor expansion; the product rule's $N^{-r/d}$, worked on the opening question's numbers.
- **Hit or miss**: the circle estimator generalized, its standard error, the rate free of the dimension; the ball in the cube, where the estimator returns 0 with standard error 0. App `hit-app`, with a *Box height c* slider.
- **The sample-mean estimator**: definition, standard error, confidence intervals from the sample standard deviation; variance compared exactly with hit or miss, then explained by conditioning and the law of total variance. Callout "Integrate out what you can". App `mean-app`.
- **What makes an integrand hard?**: Monte Carlo is blind to smoothness ($kU \bmod 1$ is uniform); cancellation is what costs; a variance bound from the range, whose worst case is a fair coin; random against evenly spaced points in one dimension.
- **Many dimensions**: the constant's growth $\rho^d$ for a product integrand; Gauss's circle as an integrated-out variable (the old chapter's TODO).
- **Further reading: quasi-Monte Carlo**: a short mention only (not course material): what quasi-random points are, the $(\log N)^d/N$ rate, random shifts in a sentence, pointers to the literature. App `qmc-app` compares the midpoint grid, Monte Carlo and Halton points on the Gaussian integral.
- Five error figures (one with a dimension slider), four new references.

Revision 1 (author's request): the first draft opened with the sample mean, then hit or miss, the hard integrands, grids, dimensions. Reordered to grid and curse first, then hit or miss, then the sample mean, so the chapter starts from the previous page's method and each method is motivated by the last one's failure. Added a grid-only figure by dimension and split the old comparison exercises so none refers forward.

Revision 2 (author's request): the governing-principle callout moved from the introduction to the sample-mean section, where it is first used.

Revision 3 (author's request): every paragraph of running prose, the callouts and the remarks rewritten in the author's voice. Exercises, definitions, theorems, captions and the Summary left as they were.

Revision 4 (author's request): the midpoint rule's Visual Math Lab link points at the app's full page, not `?embed=1`, because the full page shows the convergence plots (now a CLAUDE.md convention).

Revision 5 (author's request): a figure of the midpoint rule's rectangles (`#fig-int-riemann`, $\sin x$ on $[0, \pi]$, $N = 6$) right after the definition of $M_N$. It is an Observable Plot chart through `intFigure`, not Plotly: the picture is static, and Plotly with fixed axes and no modebar adds nothing. No readout: $M_6$ beside the exercise would answer "overestimate or underestimate?".

Revision 6 (author's request, 2026-11-21):

- *Hit or miss in many dimensions* states the estimator for $\int_{[0,1]^d} f$ directly, with no region $R$ in a box $B$; `@exr-int-hit-dimension` (a) asks for the standard error $\sqrt{I(c - I)/N}$.
- The ball: even dimensions only, $V_{2k} = \pi^k/k!$, no $\Gamma$. `@exr-int-ball` starts from the fraction $p_d$, defines the relative standard error, and the reader computes $p_d$; the table is gone, with `ballVolume` and `ballHits`.
- `int-app` split into `hit-app` and `mean-app`. The hit-or-miss app has a *Box height c* slider (from $\max f$ to $4\max f$), so the standard error is seen to grow with the wasted part of the box, ahead of importance sampling; `@exr-int-hit` (f) checks it. `sampleIntegrand` became `hitMissSample` and `sampleMeanSample`.

Dropped from the old chapter: the derivative variance bound and its proof (replaced by the range bound), the "When to use Monte Carlo" callout (its true parts are now results; its false part is the section on the constant).

Open:

- The author is still revising the chapter; update this file with what changes and why.
- `chapters/estimation-overview/` is still in the old style.
