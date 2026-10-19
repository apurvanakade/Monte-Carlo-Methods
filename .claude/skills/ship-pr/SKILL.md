---
name: ship-pr
description: Take a finished Monte Carlo Methods change all the way to the live site -- commit it on a branch in its own worktree, verify it, open a pull request into develop, triage Copilot's review (or a local maintainer agent's, when Copilot is out of credits), wait for pr-check.yml, merge, fast-forward main (which publishes), and clean up the worktree. Use when asked to commit, push, open a PR, ship, land, merge or release a change in this repository.
argument-hint: "[PR number]  (default: open a PR for the current worktree's changes)"
---

# Ship a change

A change reaches `develop` through a pull request, and `main` only by
fast-forwarding `develop`. The rules are CLAUDE.md's "Branches, PRs and
releases"; carry the change through every step below without stopping between
them. Never pass `--auto` or `--admin` to `gh pr merge`, and never merge a red
PR.

## 0. Does it need a PR at all?

Run `git status` and `git diff` (staged and unstaged) and look at what is
actually there. Another session may already have committed and pushed it:
check `git log origin/develop -3` before doing anything.

A **trivial** change may be committed straight onto `develop` and pushed: a
typo or wording fix in prose, a comment, or an edit to repo-only docs and
tooling (`CLAUDE.md`, `README.md`, `.claude/**`, `Makefile`). Stop after the
push.

Anything that touches a code cell, CSS, `_quarto.yml`, `_extensions/`,
`scripts/` or `.github/` is **not** trivial, however small. Carry on.

If a PR number was given, skip to step 2.

## 1. Branch, verify, commit, open the PR

Work happens in a worktree, never by switching branches in the `develop`
folder (`~/Github/teaching/Monte-Carlo-Methods`; a checkout there makes its
`quarto preview` re-render the whole site). `git worktree list` shows which
folder holds which branch.

- **Already in a feature worktree**: use it.
- **Uncommitted changes sitting in the `develop` folder**: move them to a new
  worktree, then clean `develop`:

  ```sh
  git stash push -u -m ship-pr
  git worktree add -b <prefix>/<slug> ../Monte-Carlo-Methods-<slug> develop
  git -C ../Monte-Carlo-Methods-<slug> stash pop
  ```

  Prefixes: `app/`, `chapter/`, `fix/`, `ci/`, `docs/`. A new worktree needs
  `npm install` once before `npm test`.

Before committing, in the worktree:

- `quarto render` finishes with no errors in the output.
- If a page's `method.js` changed (or a method was added), `npm test` passes:
  each method has its `method.test.js`, and the PR says why each expected
  number is right.
- Every page the change touches is opened in that worktree's
  `quarto preview --port <4201, 4202, ...> --no-browser`, and its apps
  exercised: every button, every slider moved, dark mode toggled, the
  `?embed=<id>` view loaded. The browser console shows no errors.
- `_extensions/apurvanakade/mathviz/` changed only if it is a release
  (`make update-mathviz`), never a local build or a hand edit; library changes
  are pull requests to apurvanakade/mathviz.
- Build output is committed only as CLAUDE.md's "Source vs. generated output"
  says.

Commit with a message that says what changed and why, then:

```sh
git push -u origin <branch>
gh pr create --base develop --title "..." --body "..."
```

The body says what changed, why, and how it was verified, and ends with the
attribution line from the system reminder.

## 2. Wait for Copilot's review

Copilot reviews once, a few minutes after the PR opens. It does not re-review
later pushes (the ruleset has re-review on push off, to save quota). Poll
`gh pr view <N> --json reviews,reviewRequests` every minute or two. Its first
review is a gate for the merge: if it hasn't arrived after ~30 minutes, ask the
user rather than merging without it. GitHub ignores a review request on a
merged PR, so a missed review can't be had afterwards.

### 2b. Copilot out of credits: a local maintainer review instead

When Copilot's quota runs out it still posts a review, with no findings and
this body: *"Copilot was unable to review this pull request because the user
who requested the review has reached their quota limit."* Check for it:

```sh
gh pr view <N> --json reviews \
  -q '.reviews[] | select(.author.login | startswith("copilot")) | .body' \
  | grep -i "unable to review"
```

If it matches, Copilot's review isn't coming. Don't wait out the 30 minutes
and don't ask the user: run a local review in its place, which then stands in
as the merge gate.

1. Spawn a fresh `general-purpose` agent on Sonnet (the Agent tool with
   `model: "sonnet"`, to save tokens; not a fork, so it starts without this
   session's context) with the prompt in
   [maintainer-review.md](maintainer-review.md), filling in the PR number and
   the PR's worktree path. Add nothing about the change: the point is a
   reviewer who knows the codebase but not the reasoning behind this work, the
   way a maintainer reading the PR cold would. Run it in the foreground; the
   next step needs its answer.
2. Post its findings on the PR as one review, so they become threads the same
   as Copilot's would. Write the payload to the scratchpad and send it:

   ```sh
   gh api repos/apurvanakade/Monte-Carlo-Methods/pulls/<N>/reviews --input review.json
   ```

   with `{"event": "COMMENT", "body": "Local maintainer review (Copilot out of credits).\n\n<VERDICT line>", "comments": [{"path": ..., "line": ..., "side": "RIGHT", "body": "**<severity>**: <comment>"}, ...]}`.
   A finding whose line isn't part of the diff can't be an inline comment
   (the API rejects the whole review); put it in `body` instead, as
   `` `path:line` -- comment ``. With no findings, post the verdict alone.
   A body finding has no thread to reply to or resolve, so step 3 must still
   fix or decline it and answer it with one PR comment
   (`gh pr comment <N> --body ...`) covering every body finding.
3. Go on to step 3 and triage these threads exactly like Copilot's. The agent
   read CLAUDE.md, so a finding that contradicts it is rarer than with
   Copilot, but it can still be wrong: check each one against the code.

## 3. Triage every comment

```sh
gh pr view <N> --comments
gh api repos/apurvanakade/Monte-Carlo-Methods/pulls/<N>/comments   # inline
```

Copilot doesn't know CLAUDE.md. For each unresolved thread:

- **Valid**: fix it. If it points at `_extensions/apurvanakade/mathviz/**`,
  it belongs in apurvanakade/mathviz: tell the user rather than editing the
  installed copy.
- **Contradicts a convention** (e.g. "use `.map()`", "use a literal color",
  "use Plotly's legend", "inline the method back into the cell"): decline it.
- **Wrong or already handled**: decline it.

Reply to every thread with one line saying what was done or why not:

```sh
gh api repos/apurvanakade/Monte-Carlo-Methods/pulls/<N>/comments/<id>/replies -f body="..."
```

Then resolve it (`resolveReviewThread` GraphQL mutation; get thread ids from
`pullRequest.reviewThreads`).

## 4. Push the fixes

Commit the fixes on the same branch and `git push`. The PR picks them up and
`pr-check.yml` re-runs. Don't wait for Copilot to review the fixes; it won't.
Go on to CI.

## 5. Wait for CI

```sh
gh pr checks <N> --watch
```

If it fails, read the log (`gh run view <run-id> --log-failed`), fix, push, and
wait again. Don't duplicate the render locally beyond step 1.

## 6. Merge into develop

Only when every check is green and every thread has a reply:

```sh
gh pr merge <N> --merge
git -C ~/Github/teaching/Monte-Carlo-Methods pull
```

`--merge`, not `--squash`: it keeps the branch's history on `develop`.

## 7. Release: fast-forward main

Publishing is part of shipping: once the PR is merged, release without
stopping to ask. Pushing `main` publishes the site (`publish.yml` renders and
force-pushes `docs/` to `gh-pages`). From the `develop` folder, no checkout
needed:

```sh
make release    # git fetch origin && git push origin origin/develop:main
```

Never squash-merge into `main` or force-push it. If the push is refused as
non-fast-forward, the histories have diverged: on `develop`,
`git merge -s ours origin/main`, push, and retry. Then confirm the publish
run started: `gh run list --branch main -L 1`.

## 8. Clean up

Stop the worktree's preview if one is running, then check
`git -C ../Monte-Carlo-Methods-<slug> status --short` and stop if it lists a
modified tracked file -- that is unmerged work. Otherwise:

```sh
git worktree remove --force ../Monte-Carlo-Methods-<slug>
git branch -d <branch>
git push origin --delete <branch>
```

`--force` because by this point the branch is merged, so the only things left
in the folder are untracked build output (`docs/`, `.quarto/`) and
`node_modules`, which a plain `remove` refuses to delete.

## Report

Say what shipped: the PR link, who reviewed it (Copilot or the local
maintainer agent), the review comments fixed or declined (with the reason),
anything left open, and that `main` was pushed.
