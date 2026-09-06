---
type: chore
priority: med
status: open
area: rotorkit/board
reporter: agent
---

# rotorkit's tessellation code (`stepgeom/tessellate.py`, `scripts/tessellate_parts.py`) is only reachable from `integration`, not `master`

Discovered while producing the mesh fixtures this handoff needed
(`annotation_surface_mvp`, 2026-09-06): rotorkit's main checkout
(`C:\workspace\rotorkit`) sits on `master` @ `63c14c4`
(`board: step_tessellation_spike active -> completed (merged)`), and that
commit is a pure rename of the handoff file (`active/ -> completed/`) with
**zero content changes** — the same shape
`ISSUE_20260904_board_move_commit_unreachable_from_integration.md` (this
repo's own `docs/issues/`) already named for a different repo. The review
branch that actually holds the tessellation code
(`review/step_tessellation_spike`, tip `0bcbca0
review/step_tessellation_spike: APPROVE - 0 blockers, suite green`) never got
merged into a lineage `master` contains: `git branch -a --contains 0bcbca0`
returns only `integration` and its remote, not `master`.

**Repro** (from `C:\workspace\rotorkit`):

```
git log --oneline master -5
# 63c14c4 board: step_tessellation_spike active -> completed (merged)
# 4225b82 <-- this and everything before it is a DIFFERENT lineage
git branch -a --contains 0bcbca0
#   integration
#   remotes/origin/integration
```

**Consequence for this handoff:** the handoff instructions said "run
rotorkit's tessellation from its main checkout" — that main checkout, on
`master`, does not have `scripts/tessellate_parts.py` or
`rotorkit/stepgeom/tessellate.py` checked out at all. Worked around by adding
a **temporary** `git worktree add ../rotorkit-tess-tmp integration`, running
the script there (against the main checkout's own `data/` fixtures and
venv), copying the output, and removing the temporary worktree afterward —
no edit landed in rotorkit. But the next session that reads "run rotorkit's
tessellation from its main checkout" literally will hit the same wall.

**Likely cause (unverified, same shape as the tolstack issue above):**
whatever merges a completed handoff's review branch into `integration` did
not happen for `step_tessellation_spike` before the "active -> completed"
board commit landed on `master` — or `master` and `integration` have simply
diverged and not been reconciled since. This is a dispatch/board-sync
question for rotorkit, not something this handoff did wrong, and it does not
block `annotation_surface_mvp`'s own deliverables (worked around above).

**Suggested fix:** merge `integration` into `master` for rotorkit (or
whatever the operator's normal batch-merge step is), then re-verify
`git branch --contains 0bcbca0` includes `master`.
