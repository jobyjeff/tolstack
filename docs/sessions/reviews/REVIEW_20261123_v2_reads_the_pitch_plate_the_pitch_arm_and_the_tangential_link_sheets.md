---
type: review
handoff: docs/sessions/active/HANDOFF_20261122_v2_reads_the_pitch_plate_the_pitch_arm_and_the_tangential_link_sheets.md
reviewer: agent
date: 2026-11-23
verdict: APPROVE
blockers: 0
---

# Review — v2 reads the pitch plate, the pitch arm and the tangential link sheets

**Work reviewed:** `handoff/v2_reads_the_pitch_plate_the_pitch_arm_and_the_tangential_link_sheets`
at `bd7b2395` (7 commits). It was not already in `integration`: `merge-base --is-ancestor`
was false at the start, and the branch was cut from the `integration` tip it merged onto
(`git log handoff..integration` was empty). This is the first review of this handoff. The
review branch had no earlier commits for it.

## What I verified myself (provenance audit)

- **Every export re-hashed.** `215735-A.pdf` → `a06526c2…c004`, `213863-004-A.pdf` →
  `4e1a1304…ec75`, `215071-C.pdf` → `39669690…d061`. Each matches its citation.
  `runs` matches `data/runs.jsonl` exactly by input sha: two runs for 215735-A, one
  for 213863-004-A. `tests/test_export_runs_match_the_run_log.py` is green as well.
- **Every callout re-read off the PDF text layer at its cited bbox** (PyMuPDF,
  drawing-checker's venv), 24 boxes. All of them read as transcribed:
  `41.040 ±0.025` / `⊥Ø0.1 A`; `5X Ø5.20 ±0.10` / `⌖Ø0.3Ⓜ A B C` over `Ø0.1Ⓜ A B`;
  `5X Ø8.520 ±0.008` / `⌖Ø0.03Ⓜ GⓂ` / `5X INDIVIDUALLY`; datum box `G 5X INDIVIDUALLY`;
  `5X Ø7.950 +0.015/0.000` / `⌖Ø0.2 A B C` over `Ø0.1 A`; `5X 4.06 ±0.10` /
  `⌖ 0.2 A B C` over `⊥ 0.05 G`; the 3X twins (`Ø8.520`/`⌖Ø0.03Ⓜ FⓂ`; `Ø7.950`/
  `⌖Ø0.2 A B` with a `C` box; `4.06 ±0.08`/`⊥ 0.05 F`); `61.40`, `Ø14.288 ±0.006` /
  `⌖Ø0.1 B`, `Ø15.876 ±0.006`.
- **The crops.** In the tactical scratch root's `crops.json` (built at `05e6ebdc`) all
  ten new citations are `resolved`, `located_by` zone, `callout_text_in_zone: true`,
  `sha256_verified: true`. I read the race-bores shot: it shows 61.40 and `⌖Ø0.1 B`
  beside 61.4 / 61.35 / 61.45.
- **The two open pitch-arm edges.** I rendered 215071-C sheet 2 and read it with vision.
  It shows `CF Ø4.826 ±0.010`, `⌖Ø0.13Ⓛ A B C`, `50.00` basic, `Ø64.030 +0.030/0.000` as
  datum B with `⊥Ø0.05 A`, `⏥ 0.02` → datum A on the side view, and `(19.55)` as a
  reference. The edge notes say what the sheet has instead. Leaving an edge open is the
  conservative direction, so the face-identity argument (lug-side face, not the clamp
  face) is filed for Jeff rather than adjudicated here, which is right.
- **The "-001 shown / -002 opposite" claims.** 215735-A's caption and note 5 are cited
  in every export note. On 215071-C, `-002 SHOWN/-001 OPPOSITE` is on sheet 2 and note 5
  ("ALL TOLERANCES APPLY TO BOTH COMPONENTS") is on sheet 1. Both confirmed in the
  text layer.

## The mandatory checks

1. **Every tolerance traces — PASS.** Ten new dimensions, each `kind: "drawing"` with
   an established export, sheet, zone, view and a callout matching the sheet (above).
   Confidence is honest. Position zones are `traced`. The three orientation zones read
   as half-zone offsets (`⊥Ø0.1 A`, `⊥ 0.05 G`, `⊥ 0.05 F`) are `inferred`, and their
   notes say why. The Ⓜ frames are carried at MMC with the bonus written out in the
   note, and the band question is filed
   (`ISSUE_20261123_a_position_band_read_from_a_frame_with_a_material_modifier_leaves_out_its_bonus.md`).
   No standard-part value and no recalled number.
2. **Signs — PASS (no new term list).** There are no new `checks`. The study changes
   only `dimension_ref`/`borrowed_from` targets. The parity tests fold v1 and v2 by the
   one `fold()` and compare term by term (`V2_EQUALS_V1_BECAUSE`).
3. **LMC/MMC — not applicable.** No `lmc`/`mmc` fields were added. All bands are
   symmetric about 0 (or about 61.40).
4. **RSS computed — PASS.** It comes from the kinematic builder. The lesson tables
   nominal, worst case and RSS per stop before and after (72.001/±0.784/±0.283;
   −6.992/±2.355/±1.034), and nothing moved. Verdicts are not on RSS.
5. **Nominal inside min/max — PASS.** I checked all 20 valued v2 edges.
6. **Quantised constraints — not applicable.** There is no cotter or castellated
   hardware on these edges.
7. **Ratio, my count.** v2: **20 of 105 edges valued — 14 traced / 4 inferred /
   2 untraced.** This handoff added 10 (7 traced / 3 inferred). The 2 untraced are the
   earlier copies of workbook B31/B26 and are listed as gaps (the crops projection lists
   both as spreadsheet sources). This matches the lesson's 10 → 20.

## Also verified

- **Scope.** Only v2's topology (the edges in the table) and v2's study changed, plus
  tests, issues and the lesson. No v1 file, id, spec library or feature-identity write
  was touched. The lesson records the binding log's hash before and after.
  **One fence crossed — `apps/viewer/tests.js`** (see nit 1).
- **Pins.** `READ_OFF_THE_SHEETS` pins nominal, band, document, sheet, zone, confidence
  and callout for each of the ten. The two open edges are pinned to `dimension is None`
  plus a note naming 215071-C.
- **Lesson arithmetic.** The 10 → 20 / 105 count re-derives (above). "27 gap rows" was
  not re-derived. The stop numbers are unchanged, and the parity test asserting
  equality is green.

## Tests

- **Tactical record:** a default tier in the worktree gave 2599 passed / 1 skipped /
  1 failed (the deliberate `test_viewer_js_suite` worktree red), with viewer fast tier
  628/628 `[real]` armed via the scratch root and annotate 334/334. It is consistent
  with the diff, so I gave it the benefit of the doubt.
- **Risky subset (merged review branch, pre-landing):** `test_tolerance_stack,
  test_topology, test_topology_projection, test_viewer_projection, test_kinematic,
  test_export_runs_match_the_run_log, test_js_python_vocabulary,
  test_viewer_readme_doc_facts, test_viewer_deep_link_contract, test_claims_registry,
  test_architecture_inventory` → **652 passed**.
- **Fast tiers:** `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/v2_sheets`
  → **628/628**, 100 `[real]` checks passed. Freshness line:
  `topologies.json @ 05e6ebdc, crops.json @ 05e6ebdc, kinematic @ 05e6ebdc, results.json @ 3b1227f5`.
  The commits after `05e6ebdc` touch only `apps/viewer/tests.js` and lessons, which
  are not projection inputs. `node apps/annotate/run_tests.cjs` → **334/334**.
- **Post-merge full suite (review worktree):** **1 failed, 2599 passed, 1 skipped** in
  513 s (ledger: inside budget). The failure is `test_viewer_js_suite_is_green`, the
  documented worktree red (no `data/projections` in a worktree). The tier it wraps is
  green through `--repo`, above. This repo's conftest prints no contention header lines.
- **Whole browser tier (post-merge):** `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack/data/scratch/v2_sheets`
  (tree `6c802ac4`, `node_modules` junctioned) took **2488.8 s** (self-recorded `merge`
  row, over budget) and passed **46/49**. I appended the measurement to the open
  `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`.
  None of the three reds comes from this diff:
  - **a suggestion names its face… (3/5)** and **a pattern is bound as its like
    faces… (5/11)** are the open
    `ISSUE_20261122_two_annotate_browser_suites_assume_live_features_are_still_unbound.md`.
    The suggestion suite failed on the same 3/5 count as on integration in the last
    review. The pattern suite's count moves between runs (2, 7, 8, now 5 of 11).
  - **annotate model in the scene** stops at 9 with `__lastAnchors` undefined, and it
    does so alone too. Baselines on the same copied data: a root built and served
    from `integration` gave **the same red**, a root at `76447229` gave **22/22**, and
    the main checkout gave 22/22. The only change between `76447229` and
    integration is v2 data from `73ef0aee` (the ten-citations handoff, whose review
    ran no browser tier). So this red was on integration before this branch arrived.
    Filed:
    `docs/issues/ISSUE_20261123_the_scene_suite_gets_no_anchors_message_once_v2_takes_ten_values.md`.
- **Witness gate:** `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration --budget-min 10`
  reached 1 of 1 entry, `fast__real-v2-s-blade-pitch-study-is-listed-under-v2-reads-v1__45252a2a`.
  Its result was NOT WITNESSED ("red before the mutation"), because `--repo` at the
  main checkout pairs this tree's `tests.js` with trunk's projections, where v2 still
  borrows. Re-run against a root built from this tree
  (`--repo C:/workspace/tolstack/data/scratch/v2_sheets --only <that entry>`):
  **1/1 WITNESSED**, 41 s.

## Findings

**Blockers:** none.

**Should-fix:** none in the work itself. One latent modelling hazard, filed so it
survives the merge:
`docs/issues/ISSUE_20261123_two_v2_plate_edges_carry_one_diametral_position_zone_each_as_its_own_band.md`.
The 5X lug's radius and height edges each carry the one `⌖Ø0.2 A B C` zone as ±0.1.
v2's study reads only the height, so today's numbers are right. A chain that takes both
edges would square the disk. The lesson raised this for Jeff (item 4), but no issue
carried it.

**Nits:**

1. `apps/viewer/tests.js` was edited although the handoff fenced off `apps/`. It is a
   test-only change: a `[real]` check still expected v1's borrowed bands, which this
   handoff's own deliverable 2 retires, and the DoD requires that tier green. The
   lesson discloses and explains it. I accept it and changed nothing.
2. The 213863-004-A `tan_link_race_bores` callout and v2's `tan_link_length` carry the
   same callout on two edges. The study pairs them with `borrowed_from`, so only one
   term enters. This is already recorded as an addendum on the v2 study issue.

**Fixed inline:** nothing.

## Issues filed or appended

- `docs/issues/ISSUE_20261123_two_v2_plate_edges_carry_one_diametral_position_zone_each_as_its_own_band.md`
  (new: the latent overcount risk).
- `docs/issues/ISSUE_20261123_the_scene_suite_gets_no_anchors_message_once_v2_takes_ten_values.md`
  (new, out of scope: an integration red from the previous handoff).
- `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`
  (a measurement appended).
- Overlay: one new **Recurring bugs** entry (one frame valued onto two edges, and the
  bbox re-read recipe).

## Found on arrival

Nothing: the review worktree was clean, and nothing was worked in the main checkout.
I created two baseline roots under `data/scratch/` and removed them.
`data/scratch/v2_sheets` is the tactical agent's, and I left it in place.

## Note for the next reviewer

When a handoff values a v2 edge from a frame another v2 edge already reads, check the
filed one-zone issue above before you accept a study that lassoes both.
