---
type: chore
priority: high
status: open
area: worktree-conventions
reporter: agent
---

# `stack_viewer_layout_v2` edited tracked files directly in the main checkout instead of its worktree

Discovered incidentally during the `fastener_stack_shadow` review
(`review/fastener_stack_shadow`), not part of that handoff's scope.

While verifying test behavior for the review, the reviewer ran a `git
checkout <commit> -- .` in the main checkout (`C:\workspace\tolstack`) to
inspect file state. That command force-overwrites every matched path's
working-tree content from the given commit — including files with unstaged
changes — and it clobbered seven uncommitted, unstaged, in-progress files
belonging to the `stack_viewer_layout_v2` handoff:

- `apps/viewer/app.js`, `index.html`, `test.html`, `tests.js`, `viewer.js`,
  `views/dom.js`, `views/stack.js`

These files are **tracked**, and per this workspace's standing worktree
convention ("Tracked files: create and edit them in your worktree and commit
them on your branch"), a session working on `handoff/stack_viewer_layout_v2`
should have been editing them in
`C:\workspace\tolstack-worktrees\stack_viewer_layout_v2` (which existed,
clean, on the correct branch) rather than directly in the main checkout. Had
that convention been followed, this incident would have been impossible:
another session's `git` operation in the main checkout cannot touch a
worktree's own working tree.

The content was recovered because the authoring session (`stack-viewer-
layout-v2-02`) still held it in its own context and could re-apply it — not
because git or any backup mechanism preserved it. A `git fsck
--lost-found` and a VS Code local-history check both came up empty. The one
untracked new file in the same edit set (`apps/viewer/views/detail.js`) was
undamaged only because untracked files aren't touched by `checkout -- .`, not
because of any convention being followed.

**Why this matters beyond the one incident:** any tracked-file edit made
directly in the main checkout is unprotected against a concurrent session's
git operations there (checkout, reset, stash, another branch's merge) in a
way the same edit inside a worktree is not. The main checkout is shared,
multi-session, shared-`data/` real estate; a worktree is single-session by
construction.

**Suggested fix:** none prescribed here — routing this to whoever owns
onboarding/dispatch conventions to decide (a lint/hook that warns on tracked-
file writes to the main checkout root outside of `board:`/administrative
commits; a reminder in the launch prompt; or accepting the residual risk).
