---
type: review
handoff: docs/sessions/HANDOFF_20260930_confidence_label_is_paired_to_its_vocabulary.md
reviewer: agent
date: 2026-09-30
verdict: APPROVE
blockers: 0
---

# Review — confidence_label_is_paired_to_its_vocabulary

## What I verified

- **Deliverable 1.** `VA.CONFIDENCE_LABEL` (`apps/viewer/viewer.js:69`) now reads
  `VOCAB.table("CONFIDENCES", {...})` with the same four keys
  (`traced`/`inferred`/`untraced`/`no_source_ref`) it always had. Read
  `vocab.gen.js`'s `table()` implementation directly to confirm the claimed
  behavior: it diffs `expected` (the generated list) against `Object.keys(entries)`
  in both directions and throws at load on either a missing or an extra key, then
  freezes the result. The argument written beside the change (every one of the
  table's thirteen `VA.CONFIDENCE_LABEL[x] || x` read sites cannot distinguish "a
  genuinely unrecognised value" from "a word generation taught the vocabulary and
  this table forgot to learn") is sound and consistent with the precedent this repo
  already set for `VA.VERDICTS` and the other nine tables converted on
  2026-09-23. No objection to taking the behavior change.
- **Deliverable 2.** `VA.NAV_VERDICT_LEVELS` (`apps/viewer/topology.js:705`) got
  its composition comment — correctly describes it as `stack.py`'s `VERDICTS` plus
  `none`/`error`, same posture as `AA.BINDING_STATES`, and says why it stays
  hand-written rather than routed through `VOCAB.table`.
- **Deliverable 3 (the sweep).** Independently re-ran it rather than trusting the
  lesson's prose: grepped `(VA|AA)\.[A-Z][A-Z0-9_]*\s*=\s*\{` across
  `apps/viewer/*.js`, `apps/viewer/views/*.js`, `apps/annotate/*.js`, and checked
  every hit's key set against every list in `vocab.gen.js`. Confirms the lesson's
  accounting:
  - `VA.STUDY_FINDING_SOURCES` has 3 of `GAP_KINDS`' 4 keys (missing
    `hardware_entry`) — a genuine partial map with its own drift-comment already
    in place, not a silent copy.
  - `VA.EXPORT_CHIP_TEXT` / `VA.VALUES_CHIP_TEXT` each mix one Python word
    (`unestablished`, `not_transcribed`) with JS-invented sentinels
    (`unlabelled`, `identity_unlabelled`) — mixed, not copies, already commented.
  - `VA.ATTENTION`, `VA.EXPORT_SUBJECTS`, `VA.PROJECTION_LABELS`,
    `VA.STACK_NAV_ALERT_KINDS`, `VA.ROW_DENSITIES`, `VA.EDGE_LENGTH_MODES`,
    `VA.LEADER_STYLES`, `VA.SUPERSEDED_STACKS`: no key-set overlap with any
    generated list — JS-owned, correctly excluded.
  - `apps/annotate/scene.js`'s `MARK_COLORS` (3 unrelated colour keys) and
    `apps/annotate/app.js`'s `state: "owner_not_in_set"` (a single scalar
    assignment, not a lookup table) are incidental word matches, as claimed.
  Found no fourth table. The sweep holds up.
- **The "could a check have found this" question** — the lesson's answer (no;
  `viewer_tables()` anchors on shape, not on "two hand-authored tables sharing a
  key set") is correct and matches this repo's overlay, which already names this
  exact gap as finding (d) under the fifth sighting of the restated-vocabulary
  entry.
- **Test fallout.** Repointing
  `test_the_extractor_fails_loudly_when_the_table_is_not_there` and the
  `viewer_tables()` docstring's worked example from `VA.CONFIDENCE_LABEL` to
  `VA.EXPORT_SUBJECTS` is correct and necessary — `CONFIDENCE_LABEL` no longer
  matches the `VA.<NAME> = {` shape the test anchors on, and `EXPORT_SUBJECTS`
  still does.
- **Merge:** clean, no conflicts (`git merge handoff/confidence_label_is_paired_to_its_vocabulary`
  fast-forward-shaped, all three concurrently-active handoff board files —
  `guard_census_pins_the_set_not_the_count`, `projection_freshness_pairs_with_the_tree`
  — survived intact).

## Tests run

Pre-merge, on `integration`, confirmed `tests/test_js_python_vocabulary.py` was
green even with the bug present (4 passed) — consistent with the lesson's claim
that no existing check could have caught this.

Post-merge, per this repo's "Choosing the risky subset" (apps/viewer/ row):
- `pytest -q tests/test_viewer_js_suite.py tests/test_js_python_vocabulary.py tests/test_viewer_readme_doc_facts.py tests/test_viewer_deep_link_contract.py` (worktree): 1 failed (expected, worktree-only `[real]` tier skip — CLAUDE.md names this exact test as red-by-design here), 15 passed.
- `pytest -q tests/test_mutation_witnesses.py`: 18 passed (no new guard added by this diff, so no new witness owed).
- `node apps/viewer/run_tests.cjs --repo .` (worktree, fast tier): 422/422 passed, 1 tier SKIPPED as expected.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` (main-checkout data, `[real]` tier): 516/516 passed — matches the lesson's own number and confirms the main-checkout projection is current, no stale-tree risk.
- Full suite, post-merge, in review worktree: `pytest -q` → 1243 passed, 1 failed (the same expected `test_viewer_js_suite_is_green` worktree gap).

Did not re-run the ~10-minute `run_mutation_witness_tests.mjs` in the main
checkout myself: this diff adds no guard, the tactical report already ran it
there (125/125, declared-guard census unchanged) after a clean
`rebuild_projections.ps1` that came back byte-identical to `master`, and nothing
in this review's own checks (real-tier 516/516 matching that report's number)
suggested drift since. Giving that record the benefit of the doubt per the
canonical test-cadence policy.

## Findings

None. No blockers, no should-fixes, no nits worth filing.

## Overlay

No new failure class surfaced — this review confirms rather than extends the
existing "fifth sighting, (d)" entry in `docs/prompts/REVIEW_AGENT.md`'s
"Recurring bugs to check". Left the overlay unchanged.

## Verdict

**APPROVE.** Merged into `integration` and pushed.
