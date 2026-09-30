---
type: bug
priority: low
status: open
area: tests/projection-freshness
class: guard_cannot_fail
audience: strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260930_projection_freshness_pairs_with_the_tree.md
---

# `crops.json` can be rebuilt from a different datasheet pile and still read "paired with this tree"

`projection_freshness_pairs_with_the_tree` (2026-09-30) closed the three arms
`ISSUE_20260924_the_projection_freshness_pairing_reads_tracked_head_content_only`
named, and in doing so wrote down what the check still cannot see. One item on
that list is a real false-green path rather than a theoretical one, and it has
no owner once that handoff completes.

**`scripts/build_viewer_crops.py` reads the datasheet pile under
`data/inbox/specs/`.** That directory is gitignored by design (forge's `data/`
convention), append-only, and shared by every worktree. Every question the
freshness check asks is a git question — is the stamped commit in this tree, was
the stamping tree dirty, do the inputs' tracked files still match, does an input
directory hold an untracked file — and **git has never heard of a file under
`data/`**. So:

- a datasheet replaced in place (a better scan of the same document, a re-export
  at a different DPI) changes every crop PNG the builder writes and moves
  nothing the check can see;
- `crops.json` then reports `crops.json @ <sha>` as paired, and the viewer's
  `[real]` crop checks compare this checkout's fixtures against crops cut from a
  pile that is no longer on disk.

The same shape, less sharply: anything a builder reads **by path** rather than
imports (the import closure is what the check derives its module inputs from),
and the builder's **environment** — a PyMuPDF or Python upgrade changes the
crops and leaves git untouched.

## Why this is `audience: strategy` and not a tactical fix

The cheap-looking fix is wrong in the direction this repo has already paid for.
Hashing `data/inbox/specs/` into the stamp on every build makes the check answer
for gitignored content, but it also means **any** rebuild of the pile — an
append, which is the one operation that directory is designed for — marks every
existing crop projection stale. An alarm that is always on is the failure
`scripts/projection_provenance.py` wrote down when `dirty` counted untracked
files. The decision is which of these the stamp should carry, and it is a design
call about evidence, not an implementation:

- nothing (today's state, with the gap recorded in the module header);
- a hash over only the pile documents a given projection actually **cited**,
  which is a set the crops builder already computes;
- the pile's own append-only log position, if one is worth introducing.

## What is already true

- The gap is stated, not implied: the header of
  `scripts/projection_freshness.cjs` lists what the check does *not* measure,
  and `docs/prompts/REVIEW_AGENT.md`'s freshness checklist item names the same
  residue. Nothing in the tree claims this is covered.
- The three arms that *were* covered by a git question are closed and witnessed
  (`tests/test_projection_freshness.py`, plus two mutation specs).

Related: `ISSUE_20260924_other_real_tiers_still_read_the_shared_projection_untested_for_freshness.md`
asks where the one freshness implementation should live. This asks what a stamp
would have to carry for that implementation to reach a gitignored input at all;
whoever answers the first should read this before deciding the stamp's shape.
