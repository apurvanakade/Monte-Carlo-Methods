# Chapter writing guide

Instructions for writing or redoing a chapter of these notes. Read this whole file before drafting; it is about the *content and pedagogy*. The mechanics (OJS cells, `method.js`, figures, apps) are in `CLAUDE.md`. The last part, [Redoing a chapter](#redoing-a-chapter-the-order-of-work), is the order of work for taking an old-style chapter to the new style.

## The model chapter

- `chapters/estimating-pi/index.qmd` is the reference. Read it in full before starting, and match its tone, structure and density.
- `chapters/estimating-integrals/` is the first chapter rewritten toward it, and the source of the procedure below. `chapters/random-numbers/` is the second. Every other chapter is still to be rewritten.

## Readers

- Advanced undergraduates and master's students in applied math.
- Assume probability, statistics and linear algebra: expectation, variance, independence, LLN, CLT, conditional distributions, Taylor expansion, matrices and eigenvalues. Use them freely, without re-teaching; a one-line reminder is fine when a fact is about to be used.
- Don't assume measure theory, functional analysis or stochastic processes beyond a first course.

## Exercises drive the content

- Pose most facts as questions, not statements. The reader derives the result in an exercise; the prose then confirms it ("You should find …") and builds on it.
- The prose sets up the question (model, notation, why we care); the exercise does the work; the text after it states the answer only as much as later sections need.
- Split an exercise into lettered parts (a, b, c …) that climb from a computation to its interpretation ("How does it change with $N$?", "Where do you use independence?", "Can you interpret this directly?").
- Ask for interpretation and sanity checks, not just computation: signs, limits, rates, "how many more samples does one more digit cost?".
- Tie exercises to the chapter's apps where possible: predict a number by hand, then check it in the app (`@exr-pi-decimal`, `@exr-pi-clt` (c)).
- Use `::: {#exr-…}` blocks with a short `## Title`, and refer to them with `@exr-…`.
- An exercise stands on its own: a reader who works only the exercises should still learn the subject. Every symbol an exercise uses is defined in the exercise itself, unless the paragraph (or definition block) directly above it introduces it, where the reader can glance up. A symbol defined in some earlier paragraph, or above an app or figure, is restated in a lead-in sentence (with a `@def-`/`@exr-` reference where there is one). A lead-in says what each symbol means; it never states a result the reader derived earlier (a standard error, a probability, a rate): re-deriving a forgotten one is a good exercise.

## Proofs, derivations, theorems

- Don't expect complicated proofs from students. Short arguments ("show that …" with a one- or two-line idea) are fine.
- Complicated *derivations* are fair game: long Taylor expansions, moment computations, changes of variables, solving for a rate or a constant, as long as each step is mechanical once set up. Scaffold them with lettered parts.
- A result whose proof is beyond the readers' level is stated as a theorem (`::: {#thm-…}`), with a citation where appropriate, and then used. Don't hand-wave a proof sketch in its place; just state it cleanly, then explore it through exercises and apps.
- Put definitions in `::: {#def-…}` blocks. Put the central takeaway of a section in a `callout-important` (e.g. "The $N^{-1/2}$ rate").

## Mathematical tricks

- Mathematical tricks are highly valued teaching material. Look for them and give them room.
- Example: in `chapters/estimating-pi/`, Buffon's estimator divides by a random count, so it is biased. The chapter spends a whole section on this: why $\mathbb{E}[1/\hat p] \ne 1/\mathbb{E}[\hat p]$, a second-order Taylor expansion for the bias, the delta method for the variance, convexity to get the sign of the bias, and MSE = Var + Bias² to show the bias is negligible. That is the kind of depth wanted.
- The first, linear analysis (an unbiased average, its variance) alone does not teach enough. Where a chapter's method has a natural non-linear or subtle twist, follow it.
- Other examples of the kind of thing to look for: the one-loop lattice-point count (`@exr-gauss-count`), Barbier's noodle via linearity of expectation over dependent pieces.
- Don't force it. Some chapters have no trick worth teaching; then don't invent one.

## Structure of a chapter

- Open with a concrete question, with a number in it, that the chapter answers.
- State the chapter's governing principle, if it has one, in one sentence in a `callout-important`, where it is first used: the introduction, or the section that introduces the chapter's new method when earlier sections come before it.
- Follow with one short sentence or paragraph on what is to come, not a full preview of the sections: no list, no "First, … Second, …".
- Each section sets up a model, poses exercises, confirms results, and shows them in an app or figure.
- Short asides go in a `.remark` block (`::: {#rem-… .remark}`).
- End with `## Summary`: one bullet per main section saying what the reader learned there ("In [Buffon's needle](#sec-buffon) we saw …"), linking back to the section (give it a `{#sec-…}` id) rather than re-explaining it. Not so terse it is a bare list of facts, not so long it re-teaches. Then a one-line link to the next chapter.
- Cite with `[@key]`; a page that cites ends with `## References` and `::: {#refs}` `:::`.

## Prose

- Running prose, not bullet or numbered lists; lists only in the Summary. Fold an enumeration into ordinary sentences.
- Write in the author's voice: the inviting voice of a textbook or a math paper, not a manual. Read the model chapter's prose for it.
  - "We" and "let us" throughout; "you" when the reader is asked to do something.
  - Full sentences joined by connectives ("So", "But", "Notice that", "In other words", "Recall that"), not a run of clipped statements or aphorisms ("The rate is free of the dimension. The constant is not.").
  - Questions that move the argument along ("Can we do better?", "So why flip the coin at all?").
  - Say when something is surprising or worth noticing, with an occasional exclamation mark.
  - Explain why a result holds or what it means, not only that it holds.
- No filler all the same. Define every symbol where it first appears.
- Keep a figure's caption to the bare minimum: name what is plotted, in a few words ("The midpoint rule for $\sin x$ on $[0, \pi]$."). Leave out anything the reader can see in the picture or its key (the number of cells, what a dot marks), and anything the text or an exercise beside it already says or asks.
- Say why a quantity matters before computing it (e.g. "Because the estimator is biased, standard error is no longer a good measure of uncertainty").
- Compare methods quantitatively (rates, constants, sample counts), not qualitatively.

## Redoing a chapter: the order of work

How to take an old-style chapter to the new style, step by step, written from the rewrite of `chapters/estimating-integrals/`. The sections above say what a finished chapter looks like; this is the order of work, and what went wrong the first time.

### 1. Read before planning

- The rest of this guide, then the model chapter `chapters/estimating-pi/index.qmd` in full, with its `method.js`.
- The chapter being rewritten: `index.qmd`, `method.js`, `method.test.js`, and any `<!-- TODO -->` comments in it. A TODO is a request from the author; carry it out or say why not.
- Its neighbors:
  - the last line of the previous chapter, which promises what this one does;
  - the next page in `_quarto.yml`'s sidebar, for the closing link;
  - any later chapter that covers a topic this one touches (e.g. `variance-reduction/` for importance sampling). Link to it; don't teach it here.
- mathviz's docs for whatever the apps will use (`docs/markup.qmd` for layout, `docs/reference/*.qmd` for `VM.*` calls). Check there before inventing a helper.

### 2. Plan the content

Decide these before writing anything:

- **The governing principle and the opening question** (see [Structure of a chapter](#structure-of-a-chapter)). For integrals the principle is: an integral is a volume times an expectation.
- **What the old chapter claimed.** List its statements and check each one. Old chapters contain claims that are loose or wrong (the old integrals chapter said Monte Carlo's performance "doesn't degrade with dimension"; only the rate doesn't). A wrong claim usually marks the place where the real mathematics is: turn it into a section.
- **The tricks.** Look for the non-linear or subtle twist [Mathematical tricks](#mathematical-tricks) asks for. Places to look:
  - two estimators of the same quantity, compared exactly (hit-or-miss against the sample mean, by conditioning);
  - a statement that is true of the rate and false of the constant;
  - a product or other structure that makes a hard quantity computable in closed form (the variance of a product integrand is $\beta^d - \alpha^{2d}$);
  - an identity behind an inequality (Koksma's inequality is one integration by parts);
  - the failure case, where the method returns a confident wrong answer (zero hits, estimated standard error zero).
- **One thread.** Find an idea that recurs and name it once in a callout ("Conditioning reduces variance"), then point back to it from later sections and from other chapters' examples.
- **The order of the sections.** Start from what the reader already has, and let each section's failure motivate the next:
  - first the deterministic method they know from a numerical analysis course, and the problem that breaks it (for integrals: a grid, and the curse of dimensionality, worked as an exercise on the opening question's numbers);
  - then the direct generalization of the previous chapter's method (hit or miss generalizes the circle estimator), with where it in turn fails;
  - only then the chapter's new method (the sample mean), introduced as the fix.

  Don't open with the new method and add the comparisons afterwards.
- **Sections**, each as: model, exercises, confirmed result, app or figure. For each section write down the one result later sections need; that is what the "You should find …" sentence states.
- **Apps and figures.** An app where the reader does something that produces a number an exercise asks for. A figure for every rate claimed. A figure whose parameter matters (dimension, length) gets a slider.
- **Theorems.** What is beyond the readers is stated with a citation and then explored: list those and their sources.

### 3. Methods and numbers first

Write `method.js` and compute every number the prose will quote **before** writing the prose.

- Put each sampler, estimator, rule and error study in `method.js` as plain functions of numbers and a seeded `rng`.
- Write a throwaway script next to it that imports `../../scripts/load-vm.mjs` and `./method.js` and prints:
  - every closed-form number an exercise's answer or a "You should find" will state;
  - every simulated number a figure's readout will show, with the page's seeds;
  - the fitted order of every curve;
  - the time each study takes (a figure that re-simulates on a slider should take well under 200 ms).

  Delete the script when done.
- Use what it shows. If the simulation disagrees with the planned prose, the prose changes. If a comparison comes out the other way from expected, that is usually worth an exercise.
- Then write `method.test.js`: fixed seeds, and for each assertion a comment saying why the number is right (a closed form, a known limit, a brute-force check of a clever algorithm).

### 4. Write the page

In this order: setup cell and helpers, then section by section.

- Exercises carry the derivations; the prose after one states only the result. Every "You should find" number comes from step 3.
- An exercise part that sends the reader to an app names the control and the value to set.
- A table or readout must not print the answer to the exercise beside it. Give the inputs (the fraction $p_d$), not the result (the sample size).
- End with the Summary bullets, the link to the next page, and `## References` if anything is cited. New `references.bib` entries are written from memory unless looked up: say so when reporting.

Patterns that worked:

- **An app in the section that defines its method**, not one app with a method selector: a selector made the reader set a control ("leave *Method* on …") before the second method existed. A comparison of two estimators (hit or miss against the sample mean) is a figure in the section that makes it.
- **A slider for the method's free parameter** (the box height $c$ of hit or miss) with the same seed across its values, so the same points move and only the parameter's effect changes the readout.
- **A slider-driven figure** keeps fixed axes (set both domains, clip the marks), so only the curves move, and reads its slider through a 300 ms pause.
- **Random against deterministic on one chart**: a random method is its RMS error with a band over many runs; a deterministic one is unjoined dots with its fitted line. The fitted orders go in a `statRow` under the chart, and the exercise asks the reader to compare them with the derived rate.
- **A product integrand** makes a grid in $d$ dimensions free to evaluate (the grid sum is a one-dimensional sum to the power $d$), so the curse of dimensionality can be drawn out to $10^6$ points.

### 5. Check

- `node --test chapters/<slug>/method.test.js` passes.
- Load the page in a headless browser and collect: uncaught errors, `.observablehq--error` cells, the text of every `.vm-stat-row`. Compare the readouts with the numbers from step 3.
- Screenshot each app and figure and look at them, at desktop width and at 400 px.
- Dark mode: emulating `prefers-color-scheme` does not switch the site's theme. Call `window.quartoToggleColorScheme()` in the page, then screenshot.
- Drive the controls once: every selector option, each slider at both ends.
- The two 404s from `giscus.app` on a local preview are expected (no discussion exists for the page yet).

### Things that went wrong the first time

- **The prose read like a manual.** The first draft was terse: short declarative sentences, colons, aphorisms, no "we". The author's pages are inviting, the way a textbook is written. Before writing prose, reread a few paragraphs of the model chapter for the voice, and follow [Prose](#prose). Keep the structure (question, app, exercises, explanation, examples); only the sentences change.
- **Cross-page `@exr-…` references don't resolve** on a website. Link instead: `[the standard-error exercise](../estimating-pi/#exr-pi-variance)`. The render prints "Unable to resolve crossref" for each one.
- **`statRow` labels truncate** at about 20 characters, and a fifth tile wraps to its own row. Keep labels short, put the definition in `title`, and keep to four tiles.
- **A safety cap in a study function** (stop the grid at 400 cells per axis) silently cut a curve short in another dimension. Check each slider value's figure, not only the default.
- **A discrete estimator's lower quantile can be zero**, which a log axis can't show: clamp a band's lower edge to the axis floor.
- **The analysis-figure helpers are copied per page** (`piFigure`, `intFigure`, the log axis, the error figure). A third chapter that needs them should prompt moving them into mathviz instead of a third copy.
