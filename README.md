# Monte Carlo Methods Lecture Notes

A Quarto book, published from `docs/` to GitHub Pages. Interactive apps are
built with [mathviz](https://github.com/apurvanakade/mathviz).

## Build

```sh
make build      # = quarto render
make preview    # = quarto preview
```

Every build first runs `scripts/update-mathviz.sh` (a `pre-render` hook in
`_quarto.yml`), which pulls the latest mathviz release into `_extensions/`.
A full render always checks; `quarto preview` checks at most once an hour.
Offline, the build continues with the copy already installed.

Python cells run in the project's `.venv` (Quarto finds it through
`QUARTO_PYTHON` in `_environment`). To create it:

```sh
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Layout

```
_quarto.yml           book config; enables the mathviz filter
_extensions/          mathviz (managed by scripts/update-mathviz.sh -- don't edit)
index.qmd             preface
chapters/             lecture notes, one folder per part
appendices/           probability and Markov chain background
apps/                 interactive apps (mathviz); add each to _quarto.yml
assets/               site CSS
scripts/              build hooks
_legacy/apps/         the old D3 apps, kept as reference while porting (not rendered)
references.bib
docs/                 rendered site (build output, committed for GitHub Pages)
```

## Writing an app

Each page already has `VM`, math.js, Plotly and the mathviz stylesheet. Start
from the mathviz [starter pages](https://github.com/apurvanakade/mathviz/tree/main/starter)
and the [docs](https://apurvanakade.github.io/mathviz/).

## Notes

### 06-19-2025

Converted chapters to Quarto, but some still rough around the edges. 7 Gibbs Sampling `model` is not defined in the code 12 Bootstrapping `skew` is not defined in the code 13 Hidden Markov Models is only code with no exposition Also some extra notebooks that were not included but maybe should be 8 contains 'Gibbs proof' and 'Remarks' notebooks 10 Variance Reduction has some extras 11 Var Reduction Continued has 'simpy' and 'test' 12 Optimization should 'scratch' be included or not?
