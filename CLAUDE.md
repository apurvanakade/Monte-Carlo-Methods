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
- `_extensions/apurvanakade/mathviz/` is the installed upstream release, managed by `scripts/update-mathviz.sh`. **Never edit it** — the next update overwrites it. Patch bugs in it through mathviz-local instead (see "Fixing a bug in upstream mathviz").
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
- `filters: [mathviz]` — mathviz's filter puts math.js, Plotly, `mathviz.js` and `mathviz.css` into `<head>`. When mathviz-local exists (below) it is listed *after* mathviz, `filters: [mathviz, mathviz-local]`, so its `dist/mathviz-local.{js,css}` load after mathviz's and extend the `VM` it already defined.
- The `mathviz:` block turns on `referrer`, self-hosted `fonts`, `report-bug` (select text → an issue on this repo) and `share` (a Share button on every `.vm-app`, which also enables `?embed=` mode). The theme is mathviz's: `format.html.theme.{light,dark}` name its generated SCSS. Site-only overrides go in a second SCSS file listed *after* those, setting `$vm-*` tokens.

### Contributing to mathviz

There are two places a shared function can live, and which one is decided by who needs it:

1. **Only this site needs it (for now)** → `_mathviz/` here, shipped as the local extension `mathviz-local`.
2. **Any mathviz site could use it** → upstream (after starting in `_mathviz/` here, if this site needs it now). A **bug fix** to something mathviz ships is patched here first — see "Fixing a bug in upstream mathviz" below. mathviz's library code is **authored in [VisualMathLab](https://github.com/apurvanakade/VisualMathLab)'s `_mathviz/`** and mirrored out to the mathviz repo automatically — not edited in the mathviz repo directly. Read VisualMathLab's CLAUDE.md ("The mathviz library") before working there.

A utility used by exactly one app stays in that chapter's OJS cells; move it into `_mathviz/` once a second app needs it or it is plainly generic.

#### Adding or changing a function in `_mathviz/` (this repo)

**mathviz-local is not currently installed**: everything it held moved upstream in mathviz v0.1.11, so `_mathviz/` and `_extensions/mathviz-local/` were deleted. To bring it back, restore both from the last commit that had them, `git checkout b2657b7 -- _mathviz _extensions/mathviz-local`, then delete the old `src/js`/`src/css` files (they are all in mathviz now; keeping one would shadow the upstream version), empty the `js`/`css` lists in `src/manifest.mjs`, the extra assertion in `manifest.test.js` and the "What's here" table in `_mathviz/README.md`, re-add `mathviz-local` after `mathviz` in `_quarto.yml`'s filters, and restore the Makefile targets `test` (`cd _mathviz && node --test`) and `mathviz-local` (`node _mathviz/scripts/build.mjs`). Bump the extension version past `0.1.0`. Then follow the steps below.

`_mathviz/` mirrors mathviz's `src/` layout **path for path**, so that moving code upstream is a file copy. Don't rearrange it.

1. **One function per file**: `_mathviz/src/js/<category>/<kebab-name>.js` defines `VM.<category>.<camelName>`. Categories reuse mathviz's (`numerical`, `sampling`, `plotting`, `ui`, `discreteMath` → folder `discrete-math/`, ...); (`mcmc` too, since v0.1.11). Check the installed `_extensions/apurvanakade/mathviz/dist/mathviz.js` first — don't re-implement something mathviz already ships.
2. **Shape**: an IIFE that spreads into the existing namespace without clobbering it, ending in `})(window)` with **no semicolon** (the build inserts separators). For example (the shape of mathviz's own `mcmc/running-mean.js`):
   ```js
   (function attachVM(globalThis) {
     /** JSDoc ... */
     const runningMean = (values) => { ... }

     globalThis.VM = {...globalThis.VM, mcmc: {...globalThis.VM?.mcmc, runningMean}}
   })(window)
   ```
   Other `VM.*` functions are read through `globalThis.VM` **at call time**, not captured at load time, unless the manifest orders them first.
3. **JSDoc on every public function** — params, return value, edge cases (empty input, `NaN`). It is the raw material for mathviz's reference docs when the function moves upstream.
4. **Test next to it**: `<kebab-name>.test.js`, using `node:test` and `node:assert/strict`, loading the real code with `import { loadVM } from '../../../scripts/load-vm.mjs'`. `loadVM()` evals the installed mathviz bundle and then every file in manifest order, so tests exercise the actual source, with mathviz's functions (`VM.sampling.seededRandom`, ...) available. Use seeded randomness so tests are deterministic.
5. **Register it in `_mathviz/src/manifest.mjs`** (`js` or `css` list), after anything it calls *at load time*. `manifest.test.js` fails if a file under `src/js`/`src/css` is missing from the manifest or listed twice; if you add a load-order dependency, add an assertion for it there too.
6. **CSS** goes in `_mathviz/src/css/<name>.css`, uses `--vm-*` tokens only (never a raw hex or named color), and classes are prefixed `vm-`.
7. `make test`, then `make mathviz-local`, then use it in a chapter and check it in `make preview` in **both light and dark mode**.
8. **Bump the version** in `_extensions/mathviz-local/mathviz-local.lua` (`VERSION`) and `_extension.yml` when `dist/` changes before a deploy — the version names the `site_libs/quarto-contrib/mathviz-local-<version>/` folder, which is what busts returning readers' caches.
9. Add a row to the "What's here" table in `_mathviz/README.md` (member, file, which chapter uses it).
10. Every new file starts with the copyright/license header (the restored `manifest.mjs` has one; `--` comments in Lua, `#` in YAML, `<!-- -->` in Markdown).

#### Moving code upstream

Follow "Porting to mathviz" in `_mathviz/README.md`: copy the files into VisualMathLab's `_mathviz/src/` at the same paths, add manifest entries there (keeping load-order constraints), and the tests work unchanged (same relative `load-vm.mjs` path). Reference docs are written in the mathviz repo on the sync PR, not here. Once a mathviz release carries the functions, delete them from `_mathviz/` here (and the manifest/README rows); when nothing is left, delete `_mathviz/` and `_extensions/mathviz-local/`, drop `mathviz-local` from `_quarto.yml`'s filters and remove the Makefile targets. (This is how the v0.1.11 port ended: VisualMathLab PR #89.)

#### Fixing a bug in upstream mathviz

Bugs in upstream mathviz are **patched here, in `_mathviz/`** (restore mathviz-local first if it is absent; see above) — not in `_extensions/apurvanakade/mathviz/`, which the next update overwrites. Because mathviz-local loads after mathviz, a file in `_mathviz/src/` can replace a broken member outright:

- **JS**: `_mathviz/src/js/<category>/<kebab-name>.js` at the **same path as the upstream file**, redefining the same `VM.<category>.<fn>` with the fix (the spread in the IIFE overwrites mathviz's version and keeps the rest of the namespace). Then there's one file to copy when the fix goes upstream.
- **CSS**: `_mathviz/src/css/<same-name-as-upstream>.css`, with rules that win the cascade — `mathviz-local.css` loads after `mathviz.css`, so an equally specific selector is enough.
- Add a regression test next to it that fails against the upstream version and passes with the patch, and a comment at the top of the file saying it patches mathviz's `<fn>` and what was wrong.
- Then follow the usual steps above (manifest, `make test`, `make mathviz-local`, version bump, README table row marked as a patch).

A patch is ported upstream like any other `_mathviz/` file. Once a mathviz release carries the fix, delete the override here — otherwise it silently shadows later upstream changes to that function.

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
- Prefer explicit `for`/`while` loops and `if`/`else` over `.map()/.filter()/.reduce()` chains and nested ternaries, in OJS cells and in `_mathviz/src/**` alike — the readers are Python-oriented. Callbacks an API requires (Plotly, `addEventListener`) are fine.
- Keep each app's logic in small named OJS cells (simulate → derive → plot → readouts) rather than one large cell.
- CSS used by one chapter stays in that chapter (a `<style>` block); design-system CSS belongs in mathviz, not `assets/style.css`, which only sizes Python-generated figures. Any CSS consumes `--vm-*` tokens so it re-themes with the site.
