---
type: chore
priority: med
status: resolved
area: .gitignore / dispatch bridge-test-inputs
reporter: agent
class: found_dirt
found_by: docs/sessions/HANDOFF_20261104_the_browser_tier_reds_left_after_the_slide_re_author.md
resolution: fixed inline 2026-11-05 (triage): .gitignore venv-win/ -> venv-win (1dce46ad), applied workspace-wide incl. forge's template/gitignore and dispatch's .venv; git check-ignore now matches the bridged link
---

# The `venv-win` link that `bridge-test-inputs` makes is not ignored, so it gets committed

`dispatch bridge-test-inputs C:/workspace/tolstack <worktree>` links the main
checkout's interpreter into the worktree as `venv-win`. tolstack's
`.gitignore` says `venv-win/`. That is a directory pattern, and git sees a
symlink as a file, so the pattern doesn't match it. `git status` shows
`?? venv-win`, and the next `git add -A` commits it.

It has happened twice in one day:

- `0bbfc1db` (the_viewer_real_tier_follows_the_slide_re_author) added it.
  `9793f59e` (its review) dropped it.
- `29b8ee0b` (the same review's APPROVE commit) added it again, and it
  reached `integration`.

On `integration` the tracked file is the link's 30-byte target text. That
breaks the next bridge: `bridge-test-inputs` prints `interpreter present
venv-win already in the candidate worktree -- not replaced`, so the worktree
has no usable interpreter, and `scripts/rebuild_projections.ps1 -RepoRoot
<worktree>` fails its preflight. It was removed again on
`handoff/the_browser_tier_reds_left_after_the_slide_re_author`.

**Fix shape:** add `/venv-win` with no trailing slash to tolstack's
`.gitignore`, so the pattern also matches the link. Check whether
`bridge-test-inputs` should instead write the link name into the worktree's
`.git/info/exclude`, which would cover every repo it bridges.
