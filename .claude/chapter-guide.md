# Chapter writing guide

Instructions for writing or redoing a chapter of these notes. Read this whole file before drafting; it is about the *content and pedagogy*. The mechanics (OJS cells, `method.js`, figures, apps) are in `CLAUDE.md`.

## The model chapter

- `chapters/estimating-pi/index.qmd` is the reference. Read it in full before starting, and match its tone, structure and density.
- It is the only chapter in the new style so far; every other chapter is to be rewritten toward it.

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

- Open with a concrete question, and state the chapter's governing principle in a `callout-important` if it has one.
- Give a short numbered list of the questions the chapter answers.
- Sections answer those questions in order; each one sets up a model, poses exercises, confirms results, and shows them in an app or figure.
- Short asides go in a `.remark` block (`::: {#rem-… .remark}`).
- End with `## Summary`: bold-labelled bullets, one per main idea, then a one-line link to the next chapter.
- Cite with `[@key]`; a page that cites ends with `## References` and `::: {#refs}` `:::`.

## Prose

- Plain, direct sentences; no filler. Define every symbol where it first appears.
- Say why a quantity matters before computing it (e.g. "Because the estimator is biased, standard error is no longer a good measure of uncertainty").
- Compare methods quantitatively (rates, constants, sample counts), not qualitatively.
