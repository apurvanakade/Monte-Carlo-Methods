# Monte Carlo Methods Lecture Notes

A Quarto website, rendered by GitHub Actions and published to GitHub Pages. Interactive apps are
built with [mathviz](https://github.com/apurvanakade/mathviz).

## Build

```sh
make build      # = quarto render
make preview    # = quarto preview
```

Every build first runs `scripts/update-mathviz.sh` (a `pre-render` hook in
`_quarto.yml`), which pulls the latest mathviz release into `_extensions/`.
A full render always checks; `quarto preview` checks at most once an hour.
Offline, the build continues with the copy already installed. `_extensions/`
is not tracked; `npm test` runs the same script first.

Every code cell is OJS (or, for a diagram, a Mermaid fence) and runs in the
reader's browser, so there is nothing to install beyond Quarto.

## Layout

```
_quarto.yml           site config (sidebar, mathviz options); enables the mathviz filter
_extensions/          apurvanakade/mathviz (installed by scripts/update-mathviz.sh, untracked -- don't edit)
index.qmd             preface
chapters/<slug>/       one folder per published page: index.qmd (+ method.js, tests, images)
drafts/<slug>/         draft pages, same shape
_chrome/              site chrome: exercise and callout styling, title block
scripts/              build hooks
references.bib
.github/              render on PRs (pr-check), publish main to gh-pages (publish)
docs/                 local build output (untracked)
```

## Writing an app

Apps live in the chapter that explains them, as OJS cells. Each page already
has `VM` (including `VM.mcmc.*`, `VM.ui.statRow`, ...), math.js, Plotly and
the mathviz stylesheet.
Start from the mathviz [starter pages](https://github.com/apurvanakade/mathviz/tree/main/starter)
and the [docs](https://apurvanakade.github.io/mathviz/), or copy an existing
app (`chapters/estimating-pi/index.qmd` is the simplest).

- Wrap the app's controls, readouts and main chart in
  `<div class="vm-app" id="<name>-app">`. That block is what
  `chapters/<slug>/?embed=<name>-app` shows on its own, and what the Share
  button offers as an `<iframe>`.
- Several apps can share a chapter: prefix every OJS cell name and URL
  parameter with the app's name (`pi`, `buffon`, ...), since both are
  page-wide.
- A new reusable function goes into mathviz (see CLAUDE.md, "Contributing to
  mathviz").

## Notes

### 06-19-2025

Converted chapters to Quarto, but some still rough around the edges. 7 Gibbs Sampling `model` is not defined in the code 12 Bootstrapping `skew` is not defined in the code 13 Hidden Markov Models is only code with no exposition Also some extra notebooks that were not included but maybe should be 8 contains 'Gibbs proof' and 'Remarks' notebooks 10 Variance Reduction has some extras 11 Var Reduction Continued has 'simpy' and 'test' 12 Optimization should 'scratch' be included or not?
