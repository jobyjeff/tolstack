---
type: chore
priority: medium
status: resolved
area: repo-setup
reporter: agent
---

# tolstack has no git remote — nothing is pushed anywhere

Found during the `tolstack_founding` review (2026-08-04) at the integration step.

> **RESOLVED 2026-08-04.** Jeff created the repo; `origin` is
> `https://github.com/jobyjeff/tolstack.git`, matching the pattern every other
> workspace repo uses. `master` pushed and tracking (`41d3893`, which includes the
> founding work and this review). The **upstream half is still open** — see the
> suggested fix below: neither `forge new-repo` nor `forge check` knows about
> remotes, so the next repo founded will hit this too. That part belongs in forge,
> not here.

## What

`git remote -v` in `C:\workspace\tolstack` returns **nothing**, so
`git push origin master` fails with `fatal: 'origin' does not appear to be a git
repository`. The merge landed locally (`301fd3e`); it exists on this machine only.

The review role prompt states that every repo has a GitHub remote as of
2026-07-14. tolstack was founded 2026-08-03, after that date, and did not get
one — `forge new-repo` stamps the template and `git init`s, but does not create or
attach a GitHub repository, and `forge check` does not look for a remote.

## Impact

Everything in this repo is unbacked: the SOP, the review checklist, the imported
stack definitions and worksheets, and `PROVENANCE.md` — the record that makes the
imported material traceable at all. The gitignored specs pile (42 files, ~112 MB)
was **moved** here from drawing-checker, so this machine is now the only copy of
that pile's location too, though that content was never in git on either side.

## Suggested fix

Create the GitHub repo and attach it (`gh repo create`, then
`git remote add origin …` and `git push -u origin master`). Then decide whether
this belongs upstream: either `forge new-repo` creates and attaches the remote, or
`forge check` flags a missing remote as drift. The second is cheaper and catches
every repo founded before the fix, not just future ones — the same argument the
founding lesson makes about the surviving `{{REPO_NAME}}` placeholder.
