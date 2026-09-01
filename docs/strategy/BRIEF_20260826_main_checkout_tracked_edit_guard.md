# STRATEGY BRIEF 2026-08-26 — main_checkout_tracked_edit_guard: should something guard against editing tracked files in the main checkout instead of a worktree?

> **CONSUMED 2026-09-01 — Jeff decided: build a mechanical guard if a clean
> discriminator exists (it recurs often). Dispatch-side per this brief's own
> analysis: expanded to
> `dispatch/docs/sessions/HANDOFF_20260901_main_checkout_edit_guard.md` (med) —
> env-marked worktree sessions + a PreToolUse hook blocking tracked
> main-checkout writes; investigate-first, no guard that false-positives.**

**Routing note.** `docs/issues/ISSUE_20260825_stack_viewer_layout_v2_edited_the_main_checkout_directly.md`
is `type: chore`, `priority: high`, with no `audience:` tag — by the closed
routing table that would default to a tactical handoff. Triage is routing it to
strategy instead: the issue's own "Suggested fix" section explicitly names three
mutually-exclusive options and says "none prescribed here — routing this to
whoever owns onboarding/dispatch conventions to decide." A tactical handoff needs
a chosen scope to execute; this issue is the choice itself, not an omission of
one. (Applying the "route by decomposition need" test from the triage prompt: a
concrete single-scope change goes tactical, anything needing a decomposition/
design decision goes strategy — this is the latter, the `type` label
notwithstanding.)

This is also **cross-repo in effect**, even though the incident happened in
tolstack: the worktree-vs-main-checkout convention this issue is about is
authored in dispatch (`C:\workspace\CLAUDE.md`'s "Worktree reality" section,
composed into every dispatch-launched agent's seed) and applies identically to
every registered repo. Whatever this decomposes into is likely a dispatch-side
change (the standing prompt text, or a hook/lint dispatch already has the
launch-time leverage to install), not a tolstack-only fix — flag that to
whichever strategy session or repo picks this up.

## What happened

During the `fastener_stack_shadow` review, the reviewer ran `git checkout
<commit> -- .` in the main checkout (`C:\workspace\tolstack`) to inspect file
state. That command force-overwrites every matched path's working-tree content
— including unstaged changes — from the given commit. It clobbered seven
uncommitted files belonging to the separately-running `stack_viewer_layout_v2`
handoff (`apps/viewer/{app.js,index.html,test.html,tests.js,viewer.js}`,
`apps/viewer/views/{dom.js,stack.js}`), because that session had been editing
tracked files directly in the main checkout instead of its own worktree
(`C:\workspace\tolstack-worktrees\stack_viewer_layout_v2`, which existed, was
clean, and was on the right branch). Recovery only worked because the authoring
session still held the content in its own context and could re-apply it — `git
fsck --lost-found` and VS Code local history both came up empty.

## Why it's a decision, not a patch

The worktree convention already exists and already says tracked-file edits
belong in the worktree — this incident is a **violation** of a written
convention, not a gap in one. So the question isn't "what should the rule say,"
it's "what enforces it, given the rule already didn't stop this." The issue
names three live options with real tradeoffs:

1. **A lint/hook that warns on tracked-file writes to a main-checkout root**
   outside of `board:`/administrative commits — mechanical, but needs to
   distinguish legitimate main-checkout writes (dispatch itself, orchestrator/
   triage/job sessions, which the standing instructions say run in the main
   checkout by design) from a tactical session that should have been in a
   worktree.
2. **A stronger reminder in the launch prompt** — cheap, but the convention is
   already stated in the standing instructions every dispatch-launched session
   receives, and that didn't prevent this incident, so a reminder alone has a
   weak prior.
3. **Accept the residual risk** — the main checkout is shared, multi-session
   real estate; any tracked edit there is exposed to a concurrent session's git
   operations (checkout, reset, stash, a merge on another branch) in a way a
   worktree's edits structurally are not. Accepting this means saying so
   explicitly, not by omission.

## What a strategy agent needs to resolve first

Whether (1) is even buildable without false positives requires knowing, precisely,
which sessions are *supposed* to write tracked files in the main checkout
(dispatch's own repo, orchestrator/triage/job roles per the standing
instructions) versus which are violations (a tactical/review agent that should
be in `<repo>-worktrees/<slug>`). That inventory lives in dispatch's launch
code/prompts, not in tolstack — which is the other reason this likely
decomposes into a dispatch-side handoff even though it was found here.
