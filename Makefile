# `quarto render` / `quarto preview` also work directly; both run
# scripts/update-mathviz.sh first (pre-render hook in _quarto.yml).

.PHONY: build preview update-mathviz mathviz-local test deploy

build:
	quarto render

preview:
	quarto preview

update-mathviz:
	QUARTO_PROJECT_RENDER_ALL=1 scripts/update-mathviz.sh

# Rebuilds _extensions/mathviz-local/dist/ from _mathviz/src/ (commit both).
mathviz-local:
	node _mathviz/scripts/build.mjs

test:
	cd _mathviz && node --test

deploy: build
	git pull
	git add -A
	git commit -m "update on `date +'%Y-%m-%d %H:%M:%S'`"
	git push
