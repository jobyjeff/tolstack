---
type: review
handoff: docs/sessions/active/HANDOFF_20260921_mutation_witness_enrollment_backlog.md
reviewer: agent (review/mutation_witness_enrollment_backlog)
date: 2026-09-22
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-22 — mutation_witness_enrollment_backlog

Work reviewed: `handoff/mutation_witness_enrollment_backlog` @ `f402884`, one
commit, four files (`scripts/mutation_witnesses.json` +276, two issues, one
lesson). Baseline `integration` @ `a240d21`. The merge into
`review/mutation_witness_enrollment_backlog` was clean — no conflict, so the
carve-out in the canonical prompt does not apply.

## Scope

Purely mechanical transcription: enroll the 26 mutation-witness rows named in
two closed 2026-09-18 lessons (`reader_facing_surfaces_second_pass`,
`visual_rules_nothing_checks`) whose intended enrolling handoff
(`mutation_witness_enrollment_gaps`) had already reached `completed/` and
merged before either lesson landed. No guard, check, or `apps/` file is in
scope; the fence held — `git diff --stat` touches only
`scripts/mutation_witnesses.json` plus two new `docs/issues/` files and one
lesson.

## What I independently re-derived rather than trusted

**Both pre/post row counts, by re-running the tier myself, not by reading the
lesson's numbers:**

- Pre-merge (branch point, 73 entries): `pytest -q tests/test_mutation_witnesses.py`
  → **14 passed**. `node scripts/run_mutation_witness_tests.mjs --repo
  C:/workspace/tolstack` → **70/73 witnessed**, with the same three
  pre-existing misses the lesson and `ISSUE_20260921_three_declared_
  mutations_are_unwitnessed_on_trunk_after_the_batch_merge.md` already name
  (`leader-style-survives-a-topology-switch`, `worst-verdict-ranks-worst-last`,
  `arriving-at-an-element-shows-its-part-in-3d`).
- Post-merge (96 entries, confirmed by `grep -c '"id":'`): pytest still **14
  passed**. The mutation tier → **93/96 witnessed** — all 23 new entries
  WITNESSED, the same three pre-existing misses, nothing else moved. This
  matches the lesson's claimed numbers exactly, independently reproduced.

**The count reconciliation.** 26 rows named for enrollment (13 + 13), 4
excluded, 22 enrolled as rows — one of which (the `VA.PANE_CROP` row, which
names both the stack pane and the topology pane) becomes 2 JSON entries, so
22 rows → 23 entries. 73 + 23 = 96. Arithmetic checks out.

**Every excluded row, checked against the code rather than taken on the
lesson's word:**

1. `annotate-word-tables-survive-the-ban-list` — excluded because
   `apps/annotate/run_tests.cjs`'s scan does `Object.keys(row).forEach(...)`
   on `AA.BINDING_STATES`/`AA.BINDING_STATE_ALERTS`, and both are flat
   `{key: string}` maps. Confirmed by reading the check at
   `apps/annotate/run_tests.cjs:218-228` — `row` is a string, so
   `Object.keys(row)` really does return character indices. Filed as
   `ISSUE_20260922_the_annotate_word_table_ban_scan_iterates_characters_not_sentences.md`,
   correctly typed (`bug`, `med`, `open`, `found_by:` pointing at this
   handoff).
2. `attention-flag-is-not-filled` — excluded because the fill census
   (`scripts/run_viewer_browser_tests.mjs:6105`, `testTypographyRules`) runs
   only on the stack view, and `.tvflag` is written only by
   `views/topology.js`'s DAG grid row renderer. Confirmed by grep: the only
   `.tvflag` fill-state read in the whole script is that one census line.
   Filed as `ISSUE_20260922_the_dag_attention_flags_fill_budget_claim_has_no_witness_anywhere.md`
   (`chore`, `low`, correctly typed).
3. `source-note-stays-a-preview` — excluded because the CSS rule its `find`
   named (`max-height: 2.8em`) now scopes to `.el-export__note` only; the
   composite materials source cell it was measuring against was retired the
   same day by `reader_facing_surfaces_second_pass` and replaced with an
   outcome check. Not a new issue — correctly pointed at the pre-existing
   `ISSUE_20260918_the_source_note_clamp_checks_lost_their_subject_when_the_
   composite_source_cell_was_retired.md`.
4. The viewer's markup-scan twin — excluded because its `expect_red` string
   is shared verbatim between a `skip(...)` and a `test(...)` branch in
   `apps/viewer/tests.js`, which `test_mutation_witnesses.py`'s
   "resolves to exactly one place" pairing test structurally cannot accept.
   Correctly identified as never-enrollable rather than decayed, and correctly
   left unfiled (the dual name looks intentional, and fixing it is a guard
   edit outside this handoff's fence).

**Spot-checked `find` strings for every enrolled row** (all 23) against the
current tree with `grep -c` — every one resolves to exactly one occurrence.
No stale anchors slipped through despite three days of drift since the
lessons measured them.

## Full suite, post-merge, in this worktree

- `pytest -q` (worktree): **1208 passed, 1 failed** —
  `test_viewer_js_suite_is_green`, red in every worktree by design since
  2026-09-18 (no `data/projections/viewer/` here). Expected, not a finding.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: **478/478**.
- `node apps/annotate/run_tests.cjs`: **154/154**.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`:
  **24/25** — one failure, `[annotate rail filter + face deselect]`'s "a real
  click on the face tints it". Re-ran in isolation
  (`--only "annotate rail filter"`): **30/30**, clean. This is the
  pre-existing, already-filed flake
  (`ISSUE_20260916_the_mock_annotator_mesh_is_edge_on_to_its_own_default_camera.md`
  — the mock demo triangle is edge-on to its framing camera, so a centroid
  ray's hit/miss depends on floating-point rounding at the triangle's edge).
  Unrelated to this handoff: nothing it touches is
  `apps/annotate/fixtures.js` or `scene.js`. Not a blocker.

All four counts above match what the lesson claims, independently reproduced
rather than read and trusted.

## Lesson arithmetic audited

26 named, 4 excluded, 22 enrolled-as-rows, 23 enrolled-as-entries, 73→96,
15% (4/26) decay rate — all re-derived above and correct. The "≈2-3x the
2026-09-18 rate per entry" cost claim is a judgement call stated as such, not
a hard number, and is left alone.

## Overlay maintenance

Added two entries to `docs/prompts/REVIEW_AGENT.md`'s "Recurring bugs to
check": the quantified decay rate on lesson-measured mutation claims (worth
re-running the tier rather than transcribing on faith, even when a lesson
says "measured, not proposed"), and the annotate face-click flake with its
root-cause pointer, so the next reviewer who sees this exact sub-check red
doesn't re-diagnose it from scratch.

## Verdict

**APPROVE.** No guard, check, or app file changed. Every enrolled row
verified live against the tree; every exclusion independently checked and
sound; both pre/post counts independently reproduced; the two filed issues
carry correct frontmatter and accurate root causes. Merging to `integration`.
