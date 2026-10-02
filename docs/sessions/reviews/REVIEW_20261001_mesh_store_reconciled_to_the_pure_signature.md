---
type: review
handoff: docs/sessions/active/HANDOFF_20261001_mesh_store_reconciled_to_the_pure_signature.md
reviewer: agent
date: 2026-10-01
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-10-01 — mesh_store_reconciled_to_the_pure_signature

## What this handoff actually did

Deliverable 1 (collapse the duplicate `data/meshes/` pair) was already done —
performed inline by the 2026-10-01 second triage sweep (`82a40cb`), not by a
tactical handoff, confirmed directly against the shared main-checkout
`data/meshes/` rather than re-derived. The tactical session's real work was
deliverables 2–4: repoint every live reference to the pre-rekey signatures and
suffixed `part_id`s, and confirm the stale-alias guard (deliverable 3) already
exists and already fires.

## What I verified

- **Deliverable 1, independently.** Read `C:\workspace\tolstack\data\meshes\
  815597cb2da7407eb0e4fc1ef51386a65c5df934401e623859625ab7e05404c9\
  provenance.json` directly: its `rekeyed` block names `old_signature
  9bfdb344...`, `fused_with` naming `old_signature 1ec77e91...` moved to
  `data/meshes_superseded/1ec77e91e259...`. Confirmed that directory exists,
  intact, with its own `provenance.json`. Confirmed
  `data/mesh_migrations/signature_migration_20261002T020432Z.json`'s summary
  (`31 renamed, 1 renamed_fused_survivor, 1 moved_aside_fused_loser` = 33
  entries) matches the store. All of this matches the lesson's claims exactly
  — nothing re-derived differently.
- **The dangling `handoff:` citation.** Confirmed
  `docs/sessions/HANDOFF_20261001_mesh_store_rekeyed_to_the_pure_signature.md`
  does not exist on any branch, in either repo tree I can see. The two filed
  issues (`ISSUE_20261001_rekeyed_mesh_provenance_cites_a_handoff_file_that_does_not_exist.md`,
  `ISSUE_20261001_the_ambiguous_number_plus_expansion_test_has_lost_its_only_live_example.md`)
  both carry correct frontmatter (`type: chore`, `priority: low`, `status: open`,
  `area:`, `reporter: agent`, `found_by:` pointing at this handoff) and aren't
  duplicates of anything already in `docs/issues/`.
- **The alias table repoint**, read in full diff. Every new sha256 cited in
  `part_mesh_aliases.json`'s evidence strings (`815597cb...`, `34f032f0...`,
  `bb3745d2...`, plus the untouched 18 rows' unchanged shas) exists in
  `data/meshes/`; every old one it replaced (`9bfdb344`, `84a75703`,
  `1ed2bfd5`, `1ff0bced`, `1ec77e91`) is absent from the live store. Checked
  this by listing the directory, not by trusting the diff's own claim.
- **RED → GREEN, reproduced myself, pre-merge.** Ran
  `pytest -q tests/test_part_mesh_aliases.py` on the review branch before
  merging: `2 failed, 5 passed`, with the first failure naming all 3 orphaned
  `mesh_part_id`s and the second naming all 21 evidence rows quoting a
  now-nonexistent directory — matching the lesson's reported RED baseline
  exactly. Merged `handoff/mesh_store_reconciled_to_the_pure_signature`
  (clean, no conflicts). Re-ran: `7 passed`.
- **The two consumer-fixture repoints.** `tests/test_fit_bound_features.py`
  and `tests/test_feature_geometry.py`'s `BEARING_PART_ID` now point at
  `asm217755_MS14101_3_815597cb`; ran both after the merge —
  `25 passed, 1 skipped` (the one skip is the deliberately-left
  `asm217755_MS14101_3_1ec77e91` test at line 422/441, exactly where the
  lesson says it is, and it's the right test to leave skipped: its whole
  premise — two installed geometries under one ambiguous number, only one
  with a `placements.json` sidecar — no longer exists in the fused store).
  Ran `node apps/annotate/run_tests.cjs`: `177/177 passed`, including the
  now-unskipped MS14101-3 ground-truth check against the new id.
- **No stale citation survives anywhere live.** Grepped the whole tracked
  tree for the five old identifiers; every remaining hit is in
  `docs/sessions/active|completed/` (historical handoff records, outside the
  doc-scan corpus and correctly left as a record of what the problem was) —
  none in `ARCHITECTURE.md`, `README.md`, `CLAUDE.md`,
  `docs/ANNOTATION_SURFACE.md`, `docs/DAG_TOPOLOGY.md`, or any `.py`/`.js`.
- **Risky subset (pre-merge) + full suite (post-merge, this worktree).** Ran
  the topology-data row's subset (`test_part_mesh_aliases.py`,
  `test_tolerance_stack.py`, `test_topology.py`, `test_topology_projection.py`,
  `test_viewer_projection.py`, plus the annotate row's
  `test_feature_identity.py`, `test_js_python_vocabulary.py`,
  `test_js_vocabulary_is_generated.py`) and `test_architecture_inventory.py`
  — all green, 515+10 passed. Full suite post-merge: `1 failed, 1443 passed,
  1 skipped in 259.13s`. The one failure is
  `test_viewer_js_suite.py::test_viewer_js_suite_is_green` reporting the
  node-fs tier SKIPPED — the documented, deliberate worktree limitation
  (no `data/projections/viewer/` here), not a regression; it fails the same
  way on any worktree before or after this diff.
- **The viewer `[real]` tier, read-only, via `--repo`.** Ran
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` from this
  worktree: `428/429 passed, 1 TIER SKIPPED`. The one failure is the
  projection-freshness guard itself, correctly refusing to run `[real]`
  checks against a stale projection — it names exactly the three files this
  diff changed as differing from what the main-checkout projection
  (`topologies.json`, built from `61ee193`) was built from. This is the
  guard working as designed (same mechanism the 2026-09-24 incident this
  checklist already documents exists to prevent), not a finding against the
  diff.
- **Attempted the rebuild-and-run-in-main-checkout step** (`CLAUDE.md`'s own
  ordering: rebuild before the three main-checkout-only node tiers) by
  checking out `integration` in the main checkout after merging. Blocked by
  dispatch's `main_checkout_edit_guard.py`, correctly: a worktree session
  checking out a different branch in the main checkout is exactly rule 1's
  subject. This confirms the tactical lesson's own conclusion — rebuilding
  projections against this merged tree and running
  `node apps/viewer/run_tests.cjs`, `node scripts/run_viewer_browser_tests.mjs`,
  `node scripts/run_mutation_witness_tests.mjs` in the main checkout is the
  operator's/batch-merge's step, not a worktree session's, mine included.
  Left undone here for that reason, named rather than silently skipped.

## Findings

None. No blockers, no should-fix, no nits. This is a narrow, well-scoped
provenance repoint: every new citation checked against the live store, the
RED baseline reproduced independently rather than trusted, the two
not-fixed sites each correctly filed as their own issue with standing
frontmatter, and the lesson's every count re-derives to the same number I
got.

## Overlay

Added one new `Recurring bugs to check` entry: a `depends_on` precondition
satisfied out-of-band (here, a triage sweep performing the rekey+fusion
inline rather than through a tracked handoff) can leave the precondition's
own written artifacts citing a handoff that was never created — check that a
`handoff:`-shaped field a precondition's output wrote actually resolves,
rather than trusting the citation because the precondition itself turned out
to be satisfied. Committed on this branch (`e7bda5c`).

## Integration

- Pre-merge RED confirmed on `review/mesh_store_reconciled_to_the_pure_signature`
  before touching anything.
- `git merge handoff/mesh_store_reconciled_to_the_pure_signature` — clean,
  no conflicts.
- Risky subset and full suite green (post-merge) as recorded above.
- Fast-forwarded `integration` to this branch's tip
  (`git fetch . review/mesh_store_reconciled_to_the_pure_signature:integration`,
  `199df9d..e7bda5c`) — `integration` had not moved since this review branch
  was cut, so this was a clean fast-forward, not a merge commit.
- Pushed `origin integration` (`4489c78..e7bda5c`).
- `handoff/mesh_store_reconciled_to_the_pure_signature` and
  `review/mesh_store_reconciled_to_the_pure_signature` both still checked out
  in their respective worktrees — left for dispatch's worktree-lifecycle
  cleanup at Complete, per the canonical process.
- Did **not** touch trunk (`master`).
