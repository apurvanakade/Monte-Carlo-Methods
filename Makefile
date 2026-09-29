# `quarto render` / `quarto preview` also work directly; both run
# scripts/update-mathviz.sh first (pre-render hook in _quarto.yml).

.PHONY: build preview update-mathviz deploy

build:
	quarto render

preview:
	quarto preview

update-mathviz:
	QUARTO_PROJECT_RENDER_ALL=1 scripts/update-mathviz.sh

deploy: build
	git pull
	git add -A
	git commit -m "update on `date +'%Y-%m-%d %H:%M:%S'`"
	git push
