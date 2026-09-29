# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Monte Carlo Methods Lecture Notes is a Quarto **book** (`project.type: book`), rendered into `docs/` and published from there to GitHub Pages. Chapters are prose plus Python cells (run at render time, cached) and, in a few chapters, interactive apps written as Observable JS (OJS) cells. The apps run entirely client-side on the **mathviz** library — `window.VM`, the `ojs-*`/`vm-*` design-system CSS, the Quarto theme and the site chrome — which this repo **consumes** from [apurvanakade/mathviz](https://github.com/apurvanakade/mathviz). Everything the apps call, including `VM.mcmc.*`, is in mathviz itself; see the mathviz section below for how this site gets it and how to contribute to it.

## Commands

- `make build` (= `quarto render`) — render the whole book into `docs/`.
- `make preview` (= `quarto preview`) — live-reload preview; the right tool for iterating on one chapter.
- `make update-mathviz` — force a check for a newer mathviz release (see below).
- `make deploy` — builds, then commits **everything** (`git add -A`) and pushes. Only run it when asked.

Python cells run in the project's `.venv` (`QUARTO_PYTHON=.venv/bin/python` in `_environment`); create it with `python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt`. `execute.cache: true` is on, so an edited Python cell re-runs but an unchanged one is served from `.jupyter_cache/`.

## Source vs. generated output

- `docs/` is build output, committed for GitHub Pages. Never edit it by hand; re-render.
- `_extensions/apurvanakade/mathviz/` is the installed upstream release, managed by `scripts/update-mathviz.sh`. **Never edit it** — the next update overwrites it. A bug in it is fixed in mathviz, or hot-patched from a local overlay meanwhile (see "Contributing to mathviz").
- `_legacy/` and the old per-chapter `app/` folders are gone; the apps now live in the chapters as OJS. Don't reintroduce D3/precomputed-JSON apps.

## Layout

```
_quarto.yml      book config: chapter list, filters [mathviz], mathviz: options, theme
_extensions/     apurvanakade/mathviz (installed, don't edit)
index.qmd        preface
chapters/        lecture notes, one folder per part
appendices/      probability and Markov-chain background
apps/            the Interactive Apps gallery: a card per app, linking to its ?embed= view
assets/style.css site CSS (figure sizing only — see Conventions)
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

There is no overlay today: everything the last one held shipped in mathviz v0.1.11.

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

## Conventions

- New chapters must be added to `book.chapters` in `_quarto.yml` — a book doesn't glob-discover pages.
- Citations use `references.bib` (`[@key]`); `chapters/references.qmd` renders the list.
- Prefer explicit `for`/`while` loops and `if`/`else` over `.map()/.filter()/.reduce()` chains and nested ternaries, in OJS cells and in any local `_mathviz/src/**` alike — the readers are Python-oriented. Callbacks an API requires (Plotly, `addEventListener`) are fine.
- Keep each app's logic in small named OJS cells (simulate → derive → plot → readouts) rather than one large cell.
- CSS used by one chapter stays in that chapter (a `<style>` block); design-system CSS belongs in mathviz, not `assets/style.css`, which only sizes Python-generated figures. Any CSS consumes `--vm-*` tokens so it re-themes with the site.
