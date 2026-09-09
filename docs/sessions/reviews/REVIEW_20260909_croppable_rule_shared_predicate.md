---
type: review
handoff: croppable_rule_shared_predicate
reviewer: agent (review/croppable_rule_shared_predicate)
date: 2026-09-09
verdict: APPROVE
blockers: 0
---

# Review — `croppable_rule_shared_predicate`

Handoff: `docs/sessions/active/HANDOFF_20260909_croppable_rule_shared_predicate.md`
(now moved to `completed/`). Branch `handoff/croppable_rule_shared_predicate`
(1 commit, `bb729d5`), cut from `integration` after
`annotate_command_vocabulary_pairing_test`. Reviewed on
`review/croppable_rule_shared_predicate`, merged clean (no conflict —
`integration` had not moved underneath).

**Scope note up front**: same as the `inline_edge_crops` review this handoff
follows on from — this is not a tolerance-stack-authoring change. No
`StackElement`, `SourceRef`, dimension, or `docs/tolerance_stacks/*.json` /
`docs/topologies/*.json` file is touched. It only moves an existing predicate
between two scripts, so the seven mandatory stack checks are not applicable.
This handoff closes `ISSUE_20260908_croppable_rule_restated_across_two_scripts.md`,
filed by that prior review.

## What I verified

- **Read the handoff, the source issue, and the prior review** that filed it
  before touching code.
- **Confirmed the pre-merge state actually had the gap**: on the review
  branch before merging, `_croppable` was still defined independently in
  `scripts/build_topology_projection.py` with no import from
  `build_viewer_crops.py` — the defect the handoff describes was real, not
  already fixed by something else.
- **Read the full diff** (`scripts/build_topology_projection.py`,
  `scripts/build_viewer_crops.py`, plus the lesson file — 3 files, no test
  file changed). Confirmed:
  - `build_viewer_crops.py` gained `_is_named_export(export)` (rule 1's
    applicability test, handling both a raw dict/string and a
    `SourceExport` dataclass instance) and `croppable(source_ref)` (rule 1
    or rule 2, handling both a raw dict and a `SourceRef` dataclass
    instance).
  - `resolve_pdf`'s rule 1 branch now calls `_is_named_export(export)`
    instead of re-testing `isinstance(export, dict) and export` inline —
    same behavior, one fewer hand-copy.
  - `build_topology_projection.py` no longer defines `_croppable` at all;
    it imports the shared function under that name
    (`from build_viewer_crops import croppable as _croppable`), so the
    `crop_key` call site needed no change.
  - Checked `SourceExport`'s definition (`tolerance_stack/stack.py:148`):
    plain dataclass, no `__bool__`/`__len__` override, so `export is not
    None` is the correct (and only sensible) truthiness test for that
    branch — matches what the pre-existing code did.
  - Confirmed `resolve_pdf`'s earlier `Unresolvable` raises (no `document`,
    `kind in NO_DOCUMENT_KINDS`) are correctly left out of the shared
    predicate — those are file-resolution concerns the handoff was
    explicitly told not to touch, and the pre-existing `_croppable` never
    checked them either.
- **Merged clean**, no conflict — the merge-conflict carve-out does not
  apply.
- **Full suite, merged tree: 750 passed, 1 skipped** — matches the lesson's
  own count.
- **Re-derived the lazy-`fitz`-import claim myself, not trusted from the
  lesson**: grepped `build_viewer_crops.py` for `import fitz` — three hits,
  all inside function bodies (`pdf_from_export`/`render`/`main` region),
  none at module scope.
- **Re-ran the module-import check myself**:
  `venv-win/Scripts/python.exe -c "import build_topology_projection"` under
  tolstack's own venv (no drawing-checker venv on the path) succeeds, and
  `'fitz' in sys.modules` is `False` afterward.
- **Re-ran the real rebuild myself**, independent of the lesson's own, using
  a scratch `--data-root` (never the shared main-checkout `data/`): 750/1
  suite aside, `build_topology_projection.py --data-root .scratch` against
  the real `docs/topologies/` tree reproduces exactly 6 `crop_key`-bearing
  edges in `pitch_system`
  (`hub_blade_root_seat_position`, `end_stop_clearance`, `piston_length`,
  `pitch_plate_flange_to_link_hole`, `gas_spring_body_height`,
  `gas_spring_mount_position`) — same edge-id set the prior review and this
  handoff's lesson both report. Scratch dir removed after; nothing written
  to the shared main-checkout `data/`.
- **`ARCHITECTURE.md`'s one-line descriptions for both scripts** (unchanged
  by this diff) are still accurate; no new file was added to `scripts/`, so
  no inventory-row gap.
- **Universal check — "count/registry restated by hand"**: this is the
  literal shape of the defect the handoff fixes. Confirmed no other live
  document (`ARCHITECTURE.md`, `README.md`, `docs/DAG_TOPOLOGY.md`) describes
  the rule-1/rule-2 predicate as living in two places — the only prose
  making that claim was the dated issue/lesson/review history, which is
  exempt as dated record.
- **Universal check — data pollution**: `git status --porcelain` clean
  before and after the full suite run; the scratch rebuild wrote only to a
  worktree-local dir I removed.
- **Universal check — new guard observed failing**: no new guard was added
  by this handoff (the existing `test_croppable_is_exactly_rule_1_or_rule_2`
  now simply exercises the real shared function instead of a hand-copy), so
  there is nothing new to break-test here.

## Findings

None. No blockers, no should-fixes, no nits.

## What I did on this branch

- Merged `handoff/croppable_rule_shared_predicate` into
  `review/croppable_rule_shared_predicate` (clean, no conflict).
- Moved `docs/issues/ISSUE_20260908_croppable_rule_restated_across_two_scripts.md`
  from `status: triaged` to `status: resolved`, with a one-line pointer to
  this handoff and its lesson.
- Moved the handoff file `docs/sessions/active/HANDOFF_20260909_croppable_rule_shared_predicate.md`
  to `docs/sessions/completed/`.
- Appended a resolution note to the existing "Architectural errors to
  check" overlay entry (`docs/prompts/REVIEW_AGENT.md`, "A decision rule
  restated by hand in a second script...") recording that this handoff
  closed it, rather than adding a new entry for the same shape.

## Verdict

**APPROVE.** No blockers. Merged into `integration` (merge commit, no
conflict), full suite re-verified green post-merge (750 passed, 1 skipped),
`origin/integration` pushed.
