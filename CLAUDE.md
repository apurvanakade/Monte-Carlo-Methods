# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Monte Carlo Methods Lecture Notes is a Quarto **book** (`project.type: book`), rendered by GitHub Actions and published to GitHub Pages from the `gh-pages` branch. Chapters are prose plus Observable JS (OJS) cells: every figure, and in a few chapters an interactive app, is drawn in the reader's browser. Nothing executes at render time, and there is no Python. The apps run entirely client-side on the **mathviz** library — `window.VM`, the `ojs-*`/`vm-*` design-system CSS, the Quarto theme and the site chrome — which this repo **consumes** from [apurvanakade/mathviz](https://github.com/apurvanakade/mathviz). Everything the pages call, including `VM.mcmc.*`, is in mathviz itself or, until a release carries it, in this site's `mathviz-local` overlay; see the mathviz section below for how this site gets it and how to contribute to it.

## Commands

- `make build` (= `quarto render`) — render the whole book into `docs/` (untracked; for local checking only).
- `make preview` (= `quarto preview`) — live-reload preview; the right tool for iterating on one chapter.
- `make update-mathviz` — force a check for a newer mathviz release (see below).
- `make release` — fast-forwards `main` to `origin/develop` and pushes it, which publishes the site (see "Branches, PRs and releases"). Only run it when asked.

Nothing to install beyond Quarto (and Node, for the overlay's `cd _mathviz && node --test && node scripts/build.mjs`).

## Branches, PRs and releases

Same rules as VisualMathLab. `develop` is where work lands; `main` is a pointer to the last published state.

- **One worktree per branch.** `~/Github/Monte-Carlo-Methods` is the long-lived `develop` checkout and stays on `develop` — never `git checkout` another branch there (a checkout rewrites `_quarto.yml`/`_extensions/`, and a running `quarto preview` then re-renders the whole book). A feature branch gets a sibling folder: `git worktree add -b <prefix>/<slug> ../Monte-Carlo-Methods-<slug> develop` (prefixes: `app/`, `chapter/`, `fix/`, `ci/`, `docs/`). In it, run its own `quarto preview --port <4201, 4202, ...> --no-browser`.
- **Major changes go through a PR into `develop`**, after being verified (`pr-check.yml` re-renders the whole book on the PR as a gate, but it can't see OJS runtime errors): `quarto render` finishes cleanly, and every chapter the change touches is loaded in the preview with its apps exercised (buttons, sliders, dark-mode toggle) and no console errors. Then `gh pr create --base develop`, triage the review, merge with `--merge` (not `--squash`). The `ship-pr` skill (`.claude/skills/ship-pr/SKILL.md`) carries this through end to end; when a rule here changes, update it there too.
- **Small changes may be pushed straight to `develop`** without a PR: a typo or wording fix in prose, a comment, or repo-only docs and tooling (`CLAUDE.md`, `README.md`, `.claude/**`, `Makefile`). Anything touching a code cell, CSS, `_quarto.yml`, `_extensions/`, `scripts/` or a workflow is not small, however few lines.
- **Releasing is a fast-forward of `main` to `develop`**: `make release` (`git push origin origin/develop:main`, which the remote refuses unless it is a fast-forward — no checkout needed). Never squash- or merge-commit into `main`, and never force-push it. If the fast-forward is refused, the histories have diverged: reconcile once with `git merge -s ours origin/main` on `develop`, push, and retry.
- **Cleanup** after the merge: stop the worktree's preview, check `git -C ../Monte-Carlo-Methods-<slug> status --short` lists no modified tracked file, then `git worktree remove --force ../Monte-Carlo-Methods-<slug>`, `git branch -d <branch>`, `git push origin --delete <branch>`.
- Old unmerged work is kept on `archive/*` branches (e.g. `archive/graph-theory-experiment`, the pre-2026-09 `develop`), not deleted.

## Source vs. generated output

- `docs/` is local build output and is **not tracked** (`.gitignore`). Never commit it.
- Publishing: a push to `main` runs `.github/workflows/publish.yml`, which renders the book (via the shared `.github/actions/render` composite: pinned Quarto, then `quarto render`) and force-pushes `docs/` to the orphan `gh-pages` branch, which Pages serves directly (Pages source: branch `gh-pages`, `/`). Don't add a workflow triggered by the `gh-pages` push: a push made with `GITHUB_TOKEN` never triggers another workflow. `pr-check.yml` runs the same render on every PR into `develop` and attaches the site as a downloadable `site` artifact. When bumping Quarto locally, bump the `version:` pin in the composite too.
- `_extensions/apurvanakade/mathviz/` is the installed upstream release, managed by `scripts/update-mathviz.sh`. **Never edit it** — the next update overwrites it. A bug in it is fixed in mathviz, or hot-patched from a local overlay meanwhile (see "Contributing to mathviz").
- `_legacy/` and the old per-chapter `app/` folders are gone; the apps now live in the chapters as OJS. Don't reintroduce D3/precomputed-JSON apps.

## Layout

```
_quarto.yml      book config: chapter list, filters [mathviz], mathviz: options, theme
_extensions/     apurvanakade/mathviz (installed, don't edit); mathviz-local (built from _mathviz/)
_mathviz/        the mathviz-local overlay's source (see "Contributing to mathviz")
index.qmd        preface
chapters/        lecture notes, one folder per part
appendices/      probability and Markov-chain background
apps/            the Interactive Apps gallery: a card per app, linking to its ?embed= view
assets/style.css site CSS (static-image sizing only — see Conventions)
scripts/         update-mathviz.sh (the pre-render hook)
references.bib   bibliography for the whole book
```

## mathviz

### How the site gets it

- `_quarto.yml`'s `pre-render: scripts/update-mathviz.sh` runs before every render. It pulls the **latest tagged mathviz release** into `_extensions/apurvanakade/mathviz/` (`quarto add`/`quarto update extension`). A full render always checks; `quarto preview` checks at most once an hour (stamp in `.quarto/mathviz-updated`). Offline, it keeps the installed copy and the build continues. So a new mathviz release reaches this site on the next render with no change here.
- `filters: [mathviz]` — mathviz's filter puts math.js, Plotly, `mathviz.js` and `mathviz.css` into `<head>`. A local overlay, if one is added (below), goes *after* it: `filters: [mathviz, mathviz-local]`.
- The `mathviz:` block turns on `referrer`, self-hosted `fonts`, `report-bug` (select text → an issue on this repo) and `share` (a Share button on every `.vm-app`, which also enables `?embed=` mode). The theme is mathviz's: `format.html.theme.{light,dark}` name its generated SCSS. Site-only overrides go in a second SCSS file listed *after* those, setting `$vm-*` tokens.

### Contributing to mathviz

mathviz is authored in [apurvanakade/mathviz](https://github.com/apurvanakade/mathviz) itself: it is the hub every site consumes, and a change to it is an ordinary pull request there, carrying its reference docs and a CHANGELOG line (see that repo's CLAUDE.md and CONTRIBUTING.md). Nothing goes through VisualMathLab any more.

A utility used by exactly one app stays in that chapter's OJS cells. Beyond that:

- **Any mathviz site could use it, or it's a bug fix to mathviz** → a pull request to mathviz. To try it here first, build mathviz and `quarto add ../mathviz --no-prompt` from this repo; restore the release with `make update-mathviz` before committing.
- **This site needs it before a release carries it, or only this site ever will** → a local overlay. Copy it in from mathviz's [`kit/`](https://github.com/apurvanakade/mathviz/tree/main/kit) (`_mathviz/` + `_extensions/mathviz-local/`, with `mathviz-local` listed *after* `mathviz` under `filters:`); `kit/_mathviz/README.md` has the steps. It is laid out path for path like mathviz's `src/`, so a file at the same path as an upstream one replaces that member (a hot patch), and `node scripts/port.mjs <this repo>/_mathviz` in mathviz moves files upstream. Once a mathviz release carries them, delete them here, otherwise they silently shadow later upstream changes. When the overlay is empty, remove it again.

The overlay today holds the CDFs and quantiles (`VM.distributions.normalCdf`, `normalQuantile`, `chiSquaredCdf`, `chiSquaredQuantile`, `regularizedGamma`), `VM.distributions.sampleStats`, `VM.sampling.exponentialRandom`, `VM.filters.systematicResample`, `VM.plotting.plotWithLegend` (with `legendItems` and `lockedAxes`), a hot patch of `VM.plotting.persistentPlot` (its `height` now beats the chart box's 500px `min-height`), and a CSS hot patch keeping `layout-ncol` charts inside a phone screen, all in [apurvanakade/mathviz#15](https://github.com/apurvanakade/mathviz/pull/15). When a release carries them, delete them from `_mathviz/src/js/` and `_mathviz/src/manifest.mjs`; with nothing left, remove `_mathviz/`, `_extensions/mathviz-local/` and the `mathviz-local` filter.

## Writing an app

Apps live in the chapter that explains them (`chapters/estimation/estimating_pi.qmd` is the simplest reference; `chapters/sampling/mh.qmd`, `chapters/sampling/gibbs_2d.qmd` and `appendices/markov_chains.qmd` are the others). Every page already has `VM`, math.js, Plotly and the mathviz stylesheet — no script tags. Start from an existing app or mathviz's [starter pages](https://github.com/apurvanakade/mathviz/tree/main/starter) and [docs](https://apurvanakade.github.io/mathviz/).

- Wrap the app's controls, readouts and main chart in `<div class="vm-app" id="<name>-app">`. That block is what `<chapter>.html?embed=<name>-app` shows alone, and what Share offers as an `<iframe>`.
- Several apps can share a chapter, so **prefix every OJS cell name and URL parameter** with the app's name (`pi`, `buffon`, ...) — both are page-wide.
- Theme: one `vmTheme = Generators.observe(notify => VM.plotting.onThemeChange(notify))` / `chartColors = VM.plotting.colors(vmTheme)` pair per page; every trace color comes from `chartColors.*` (`fn`, `warn`, `ink`, ...), never a literal, so charts re-theme on dark-mode toggle.
- Charts: `xPlot = VM.plotting.persistentPlot()` in its own cell, then `xPlot(data, layout)` in the cell that builds traces — this reuses the div (`Plotly.react`) so zoom/pan survive slider moves. Legends go through `VM.ui.legendOverlay`, readouts through `VM.ui.statRow`.
- Layout uses mathviz's classes: `ojs-panel`, `ojs-row`/`ojs-grid`, `ojs-chart-block`, `ojs-chart-controls`; size inputs with `el.classList.add("ojs-fill" | "ojs-auto")` rather than inline styles.
- Shareable state: read defaults with `VM.ui.urlParam("<prefix>_x", default)` and write back with `VM.ui.syncUrlParams({...})`.
- Randomness is seeded (`VM.sampling.seededRandom(seed)`), with a "draw again" button bumping the seed, so a shared URL reproduces the same picture.
- Add a card to `apps/index.qmd`: `path:` must be the **`.html`** URL with `?embed=<id>` (Quarto drops a `.qmd` path that carries a query string), plus a thumbnail SVG in `apps/images/`.

## Figures

A chapter's non-interactive figures are OJS too, drawn from the same seeded
simulation on every load (no `vm-app`, no controls):

- One setup cell per chapter (`//| output: false`) with the `VM`/`vmTheme`/`chartColors` trio, unless the page's app already defines them — a page-wide name defined twice is an OJS error. Prefix every other cell name with a short chapter tag (`vr`, `ising`, `pf`, ...), as for apps.
- Simulate in an `output: false` cell with `VM.sampling.seededRandom(<fixed seed>)`, then draw in its own cell through a `VM.plotting.persistentPlot({height: "<px>"})` made once in a setup cell (`height` replaces the 72vh main-chart height; the box keeps its full width). Colors from `chartColors.*`, fills through `VM.plotting.alpha`. A chart whose traces need a legend is drawn through `VM.plotting.plotWithLegend(plot, traces, layout)` — mathviz's overlay legend, never Plotly's; hiding a trace keeps the axes and grid fixed. A chart without one sets `showlegend: false`. A chart whose traces need a legend is drawn through `VM.plotting.plotWithLegend(plot, traces, layout)` (mathviz's overlay legend, never Plotly's); one without sets `showlegend: false`.
- Printed numbers become `VM.ui.statRow` readouts or `VM.ui.renderTable` tables. Side-by-side panels are separate charts in a `::: {layout-ncol=2}` div; a figure with a cross-reference label is a `::: {#fig-...}` div with the caption as its last paragraph.

## Conventions

- New chapters must be added to `book.chapters` in `_quarto.yml` — a book doesn't glob-discover pages.
- Citations use `references.bib` (`[@key]`); `chapters/references.qmd` renders the list.
- Prefer explicit `for`/`while` loops and `if`/`else` over `.map()/.filter()/.reduce()` chains and nested ternaries, in OJS cells and in any local `_mathviz/src/**` alike — the readers are Python-oriented. Callbacks an API requires (Plotly, `addEventListener`) are fine.
- Keep each app's logic in small named OJS cells (simulate → derive → plot → readouts) rather than one large cell.
- CSS used by one chapter stays in that chapter (a `<style>` block); design-system CSS belongs in mathviz, not `assets/style.css`, which only sizes the static images in `chapters/images/`. Any CSS consumes `--vm-*` tokens so it re-themes with the site.
