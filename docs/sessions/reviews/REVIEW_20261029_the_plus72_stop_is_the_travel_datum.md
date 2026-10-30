---
type: review
handoff: docs/sessions/active/HANDOFF_20261029_the_plus72_stop_is_the_travel_datum.md
reviewer: agent
date: 2026-10-29
verdict: APPROVE
blockers: 0
---

# Review — the_plus72_stop_is_the_travel_datum

Branch `handoff/the_plus72_stop_is_the_travel_datum` (6 commits, tip
`d6e542f6`), merged into `review/the_plus72_stop_is_the_travel_datum`
(cut from `integration` @ `7d5d0436`) as `ee4eda4e`. The merge was clean and
`integration` had not moved. This is the first review of the handoff: no
prior report on the branch, and the branch was not already contained in
`integration`. Lesson and new issue arrive as `A`. The resolved issue arrives
as `M`, which is the handoff's own deliverable 6.

## What I verified

**Semantics against the handoff's decisions.**
- `fold_at` folds `study.point_refs` only, so a driver ref enters no
  point's fold. `StopOffset` folds the ref's leaves once, at their own
  ratios, in mm. `fold_at_stop` folds the direct terms plus the leaves at
  `|J|·ratio`, through the one `fold()`. `check_at_stop` reads that.
  There is no second combiner.
- The RSS is `sqrt(b² + (J·a)²)`, the sheared ellipse's top, by
  construction.
- `applies_to` is required on a driver ref. It is refused on a non-driver
  ref, when empty, when it names an unknown stop, and when it lists a stop
  twice. There is a test for each case.
- The datum is checked at load: the driver must be 0 at `datum.stop`.
- A declared gap has no terms and no total, and it is never complete. It
  sits on `gap_rows` and is refused once its study exists.

**Numbers, re-derived** from a projection I built from the merged tree into
a scratch `--data-root`, not copied from the lesson:

| stop | direct half | x half (wc / rss, mm) | J (deg/mm) | swept wc / rss | margin | verdict |
|---|---|---|---|---|---|---|
| −7° | 0.290224 | 0.82 / 0.561605 | −1.727892 | 1.707096 / 0.984961 | −1.207096 | marginal |
| +72° | 0.315393 | 0 / 0 | −1.248804 | 0.315393 / 0.168512 | +0.184607 | pass (budget) |

- I recomputed `|J|·h + direct` and `hypot(J·a, b)` from the projection's
  own fields, and both agree to 1e-9.
- `envelope[index].worst_case_half` equals `direct` at both stops.
- The lesson's "before" +72 figure re-walks: 0.315393 + 1.248804 × 0.82 =
  1.339412. Its kink step (1.416872 at −7°, 1.024019 at +72°) is exactly
  the old group reach.
- Both checks are `complete: false`, and the hub-anchor gap is named in
  `excluded_terms`.
- `gap_rows` = [`vpa_pitch_linkage_hub_to_feather_stop`].

The lesson's arithmetic and causal attributions hold.

**Mandatory provenance checks (1–7).** The diff authors no element value,
band or confidence.
- The one new contributor is a declared gap that carries no number.
- The datum's `note` quotes Jeff and cites S461-610/636 for the driver's
  zero, the sweep's own value.
- Checks 2, 3 and 5 have nothing new to read. Every sign enters through
  `study_ref_group`, unchanged, and `fold()` was not touched.
- Check 4: every stop reports nominal, worst case and RSS, and no verdict
  reads RSS.
- Check 6 is unchanged: the S461 budget framing and the caveats stand.
- Check 7: the element-instance traced ratio is unaffected (no stack
  changed). The kinematic study gained one untraced *gap* contributor, and
  it is on the gap list, as the SOP requires.

**Witnesses and enrollment.**
- Four specs were deleted, all for guards that were removed or renamed.
  Four were added and two re-aimed, each at a line of the new code. The
  `DECLARED_GUARDS` pin change touches pins and comments only.
- The test-only fix to `test_the_open_question_…_is_on_file` skips only
  when `docs/issues/` is empty. That happens in the witness shadow
  (`SHADOW_EMPTY_DIRS`) and never in a checkout. I grepped the other tests
  that mention `docs/issues/`: they only cite it in docstrings, so this was
  the one site.

**Universal checks.**
- No test or tier wrote into the main checkout's `data/`. Everything I built
  went to `data/scratch/review_plus72/`, removed at the end.
- The diff adds no operator hoop.
- No count is restated by hand that a test does not pair.

## Tests

The tactical report records a full suite in its worktree at `a36dc106`:
1679 passed, 1 failed (the deliberate worktree `test_viewer_js_suite` red),
5 skipped. It also records the viewer fast tier through a scratch `--repo`
(622/622), browser `--only kinematic` (21/21) and witnesses
`--changed-since integration` (32/33, the miss re-witnessed with `--only`).
That record is consistent with the diff, so I gave it the benefit of the
doubt.

**Pre-merge risky subset**, run on the merged tree (`ee4eda4e`):
- `pytest -q` over `test_kinematic`, `test_architecture_inventory`,
  `test_topology`, `test_topology_projection`, `test_viewer_projection`,
  `test_mutation_witnesses`, `test_tolerance_stack`, `test_provenance`,
  `test_claims_registry`, `test_js_python_vocabulary`,
  `test_js_vocabulary_is_generated`, `test_viewer_readme_doc_facts`,
  `test_viewer_deep_link_contract` and `test_projection_provenance`:
  **692 passed** (125 s).
- Projections rebuilt from the merged tree into
  `data/scratch/review_plus72/data`:
  - topology, viewer, crops and kinematic were built there. The kinematic
    build printed "1 of 1 built".
  - Part names and contact suggestions refused (exit 3) to overwrite the
    copies taken from the main checkout. The diff does not touch either.
- `node apps/viewer/run_tests.cjs --repo <scratch>`: **622/622**. Every
  projection is paired with `ee4eda4e3350`.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch> --only kinematic`:
  **21/21**. The −7 band joins the envelope at dx 0.005 px, dy 1.4e-14 px.
- `node scripts/run_mutation_witness_tests.mjs --repo <scratch> --changed-since integration`:
  see the post-merge section.

## Findings

**Blockers:** none.

**Should-fix:** none.

**Design (filed, non-blocking):**
- The datum line is about 210 characters, three sentences, against the
  ~160-character one-line prose budget. The handoff dictated the sentences,
  and the author flagged the overrun.
  Filed `docs/issues/ISSUE_20261029_design_the_kinematic_datum_line_is_over_the_one_line_prose_budget.md`
  (`priority: med`, a named-rule violation).

**Nits (recorded, not filed):**
- N1 `tolerance_stack/kinematic.py` `_gap_study_ref`. It treats any
  `_study_file` refusal as "not authored". If two documents ever declared
  the study, the gap would stay declared rather than refuse. That case is
  unlikely, and the duplicate would be refused anyway as soon as the gap
  was removed.
- N2 `VA.kinematicTravelBands` draws the x-band as symmetric halves about
  the driver value. The fold uses the true min/max. The two agree today,
  because the travel chain is symmetric. I added this as an overlay entry
  for when the hub-anchor chain lands, not as an issue.
- N3 The old browser spec planted a deletion of the band's path list. Its
  re-aimed successor plants the `d` line, and no spec now plants deleting
  the drawn paths. The guard is still witnessed; only that one mutation is
  no longer exercised.

## Inline fixes

None.

## Overlay

Two **Recurring bugs** entries added:
- a python test reading a `SHADOW_EMPTY_DIRS` directory silently decays its
  whole file's witnesses;
- a symmetric-halves x-band against an asymmetric fold.
