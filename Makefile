# `quarto render` / `quarto preview` also work directly; both run
# scripts/update-mathviz.sh first (pre-render hook in _quarto.yml).

.PHONY: build preview update-mathviz release

build:
	quarto render

preview:
	quarto preview

update-mathviz:
	QUARTO_PROJECT_RENDER_ALL=1 scripts/update-mathviz.sh

# Publish: fast-forward main to develop. The remote refuses anything that is
# not a fast-forward, and nothing is checked out, so a running preview in the
# develop folder is untouched. See CLAUDE.md, "Branches, PRs and releases".
release:
	git fetch origin
	git push origin origin/develop:main
