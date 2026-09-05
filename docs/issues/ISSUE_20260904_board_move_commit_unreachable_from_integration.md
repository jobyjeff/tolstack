---
type: chore
priority: low
status: open
area: dispatch/board
reporter: agent
---

# A handoff's "staged -> active" board commit can land only on `master`, unreachable from the `integration` lineage its own review branch was cut from

Discovered while reviewing handoff `viewer_consolidation`
(`docs/sessions/active/HANDOFF_20260904_viewer_consolidation.md`, read by dispatch
from the **main checkout**, `C:\workspace\tolstack`). The review process (per
`REVIEW_AGENT.md`) expects a reviewer to move the handoff file
`active/ -> completed/` as part of the APPROVE commit — a prior review
(`doc_coverage_sets_derived`, commit `a79b8a8`) did exactly this, as a pure
rename with zero content changes, because that handoff's own
`board: doc_coverage_sets_derived staged -> active` commit (`70d4700`) had
already reached the `integration` lineage by the time that review branch was
cut.

For `viewer_consolidation`, the equivalent commit
(`71159fa board: viewer_consolidation staged -> active`, on `master`, via
`7431873 strategy: stage viewer_consolidation + stack_export_tabular`) is
**not** an ancestor of `integration`, and the file does not exist anywhere in
`handoff/viewer_consolidation`'s history either — `git ls-tree -r
handoff/viewer_consolidation | grep viewer_consolidation` finds only the
committed lesson file, not the handoff doc. So this review branch (cut from
`integration`) has no copy of the file to rename at all, and creating one by
hand would mean either inventing content or reaching across to `master` —
both of which a review branch is not supposed to do (`master` is the
operator's to move, not a review agent's).

**Repro:** `git merge-base --is-ancestor 71159fa integration` (or any
`board: <slug> staged -> active` commit for a handoff staged after the last
time `master` and `integration` were reconciled) returns false, while the
handoff/review branches for that slug are cut from `integration`.

**Likely cause (unverified):** earlier handoffs' worktrees picked up the board
commit via an incidental `Merge master` / `Merge branch 'review/...'` commit
somewhere in their history (e.g. `9fb7ecc Merge master (board:
traced_labels_and_ratio staged -> active)`), not because the mechanism is
designed to propagate it — so a handoff staged without such a merge happening
to occur first is left with the file unreachable from its own branch. This is
a dispatch/board-sync question, not something the `viewer_consolidation` handoff
did wrong, and it does not block that handoff's own review (see
`docs/sessions/reviews/REVIEW_20260904_viewer_consolidation.md`).
