---
name: ship-pr
description: Take a finished Monte Carlo Methods change all the way to the live site -- commit it on a branch in its own worktree, verify it, open a pull request into develop, have a fresh maintainer agent review it, triage its findings and Copilot's, merge, fast-forward main (which publishes), and clean up. Use when asked to commit, push, open a PR, ship, land, merge or release a change in this repository.
argument-hint: "[PR number]  (default: open a PR for the current worktree's changes)"
---

# Ship a change

A change reaches `develop` through a pull request, and `main` only by
fast-forwarding `develop`. The rules are CLAUDE.md's "Branches, PRs and
releases"; carry the change through every step below without stopping between
them. Never pass `--auto` or `--admin` to `gh pr merge`, and never merge a PR
with a failing check.

## 0. Does it need a PR at all?

Run `git status` and `git diff` (staged and unstaged) and look at what is
actually there. Another session may already have committed and pushed it:
check `git log origin/develop -3` first.

A **small** change may be committed straight onto `develop` and pushed: a
typo or wording fix in prose, a comment, or repo-only docs and tooling
(`CLAUDE.md`, `README.md`, `.claude/**`, `Makefile`). Stop after the push.

Anything touching a code cell, CSS, `_quarto.yml`,
`_extensions/`, `scripts/` or `.github/` is **not** small, however few lines.
Carry on.

If a PR number was given, skip to step 3 (unless it already has a
maintainer review, in which case skip to step 4).

## 1. Branch and worktree

Work happens in a worktree, never by switching branches in the `develop`
folder (`~/Github/Monte-Carlo-Methods`). `git worktree list` shows which
folder holds which branch.

- **Already in a feature worktree**: use it.
- **Uncommitted changes sitting in the `develop` folder**: move them:

  ```sh
  git stash push -u -m ship-pr
  git worktree add -b <prefix>/<slug> ../Monte-Carlo-Methods-<slug> develop
  git -C ../Monte-Carlo-Methods-<slug> stash pop
  ```

  Prefixes: `app/`, `chapter/`, `fix/`, `ci/`, `docs/`.

## 2. Verify, commit, open the PR

In the worktree:

- `quarto render` finishes with no errors in the output.
- Every chapter the change touches is opened in that worktree's
  `quarto preview`, and its apps exercised: every button, every slider moved,
  dark mode toggled, the `?embed=<id>` view loaded. The browser console shows
  no errors.
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

## 3. Reviews

Every PR gets two reviews, and both are a gate for the merge.

**Maintainer review.** A local review from an agent that has not seen this
session:

1. Spawn a fresh `general-purpose` agent (the Agent tool, not a fork, so it
   starts without this session's context) with the prompt in
   [maintainer-review.md](maintainer-review.md), filling in the PR number and
   the worktree path. Add nothing about the change: the point is a reviewer
   who knows the codebase but not the reasoning behind this work, the way a
   maintainer reading the PR cold would. Run it in the foreground; the next
   step needs its answer.
2. Post its findings on the PR as one review, so they become threads. Write
   the payload to the scratchpad and send it:

   ```sh
   gh api repos/apurvanakade/Monte-Carlo-Methods/pulls/<N>/reviews --input review.json
   ```

   with `{"event": "COMMENT", "body": "Local maintainer review.\n\n<VERDICT line>", "comments": [{"path": ..., "line": ..., "side": "RIGHT", "body": "**<severity>**: <comment>"}, ...]}`.
   A finding whose line isn't part of the diff can't be an inline comment
   (the API rejects the whole review); put it in `body` instead, as
   `` `path:line` -- comment ``. With no findings, post the verdict alone.
   A body finding has no thread to reply to or resolve, so step 4 must still
   fix or decline it and answer it with one PR comment
   (`gh pr comment <N> --body ...`) covering every body finding.

**Copilot.** It reviews a few minutes after a PR opens, once only: pushes to
the PR don't bring a new review (the ruleset has re-review on push off, to
save Copilot quota). The maintainer review usually takes long enough for it to
arrive; if not, poll `gh pr view <N> --json reviews,reviewRequests` every
minute or two for up to ~10 minutes. If nothing arrives, go on and say so in
the final report.

## 4. Triage every finding

```sh
gh pr view <N> --comments
gh api repos/apurvanakade/Monte-Carlo-Methods/pulls/<N>/comments   # inline
```

Copilot doesn't know CLAUDE.md; the maintainer agent read it but can still
be wrong. Check each finding against the code. For each unresolved thread:

- **Valid**: fix it. If it points at `_extensions/apurvanakade/mathviz/**`,
  it belongs in apurvanakade/mathviz: tell the user rather than editing the
  installed copy.
- **Contradicts a convention** (e.g. "use `.map()`", "use a literal color"):
  decline it.
- **Wrong or already handled**: decline it.

Reply to every thread with one line saying what was done or why not:

```sh
gh api repos/apurvanakade/Monte-Carlo-Methods/pulls/<N>/comments/<id>/replies -f body="..."
```

then resolve it (`resolveReviewThread` GraphQL mutation; thread ids from
`pullRequest.reviewThreads`). Commit the fixes on the same branch and push. Neither review is
repeated on the fixes, so this is a single round.

## 5. Checks

```sh
gh pr checks <N> --watch
```

If a check fails, read the log (`gh run view <run-id> --log-failed`), fix,
push, and wait again.

## 6. Merge into develop

Only when every check is green and every finding has a reply:

```sh
gh pr merge <N> --merge
git -C ~/Github/Monte-Carlo-Methods pull
```

`--merge`, not `--squash`: it keeps the branch's history on `develop`.

## 7. Release: fast-forward main

Pushing `main` publishes the site. From the `develop` folder:

```sh
make release    # git fetch origin && git push origin origin/develop:main
```

Never squash-merge into `main` or force-push it. If the push is refused as
non-fast-forward, the histories have diverged: on `develop`,
`git merge -s ours origin/main`, push, and retry.

## 8. Clean up

Stop the worktree's preview if one is running. Check
`git -C ../Monte-Carlo-Methods-<slug> status --short` and stop if it lists a
modified tracked file -- that is unmerged work. Otherwise:

```sh
git worktree remove --force ../Monte-Carlo-Methods-<slug>
git branch -d <branch>
git push origin --delete <branch>
```

`--force` because the folder still holds untracked build output, which a
plain `remove` refuses to delete.

## Report

Say what shipped: the PR link, the maintainer review's and Copilot's
findings fixed or declined (with the reason), anything left open, and whether `main` was pushed.
