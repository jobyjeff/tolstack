---
type: review
handoff: docs/sessions/active/HANDOFF_20261022_a_general_profile_note_bands_a_model_defined_term.md
reviewer: agent
date: 2026-10-22
verdict: APPROVE
blockers: 0
---

# Review — a_general_profile_note_bands_a_model_defined_term

Branch `handoff/a_general_profile_note_bands_a_model_defined_term` (7 commits,
`f6bf08f`..`ac680f9`), merged into `review/…` cut from `integration` at
`5589c39`. `integration` had not moved since the handoff branched, so the merge
had no conflicts. This was the first run of this handoff (no prior review
commits on this branch), and every lesson, issue and spec arrives as `A`.

## What I verified

**Provenance audit (overlay check 1).** I opened every new or changed citation.

- **214698-002 A, note 6.** The export re-hashes to `512597e9…249228`, and that
  equals `runs.jsonl`'s input for `20261020_134240_214698-002-A`, the only run of
  that sha. The run's `214698-002_A_p01.json` note 6 reads
  `⌓0.5 UNLESS OTHERWISE SPECIFIED.` verbatim, which matches the `callout`.
  ±0.25 = 0.5/2, bilateral. ✓
- **213668-002 A.1, note 12.** The export re-hashes to `dea285f5…6fc76`. The run
  JSON's note 12 is `1 UNLESS OTHERWISE SPECIFIED`, with the symbol dropped, as
  the note says. I rendered `page_1.png` and the frame is a closed semicircle,
  surface profile, reading 1. ±0.5. ✓ The `runs` list is incomplete (should-fix 1).
- **76.86 ±0.10**, SECTION C-C, sheet 1. It is on the render as cited, and it
  agrees with `pitch_system`'s row-41 citation of the same callout. It is
  recorded on its own edge, which no study selects (Jeff's ruling 2 honoured). ✓
- **ATS context.** S4ATS-2439 / S4ATS-2379 and the `vp_range_of_motion` /
  `post_rig_hardstop_rom` ids exist in atp-post's `apps/dashboard/criteria.json`.
  Each states "less than or equal to 65mm" with `c_status = 'draft'`. Both are
  cited by id and not transcribed. ✓
- Jeff's rulings 1–4 are quoted verbatim where the handoff asked. The ~1 mm is
  marked as Chao's unverified estimate. ✓
- Nothing was written into drawing-checker. I only read it.

**Signs (check 2).** travel = cover (+) − mount (−) − lower head (−) − upper head (−).
I re-read this against the edge orientations (`piston_cover_mount_flange_seat` →
shoulder +82.154; seat → `endstop_feather_contact` 8.667; contact → heads seat
2.491; seat → step face 6.556). ✓

**The fold (checks 4, 5), re-derived by hand:** 82.154 − 8.667 − 2.491 − 6.556
= **64.440**. Worst case 0.02 + 0.05 + 0.25 + 0.5 = **±0.82** (63.62–65.26). RSS
√0.3154 = **±0.5616** (63.878–65.002). That is exactly the handoff's expectation.
The worksheet and lesson agree, and `tests/test_end_stop_travel_study.py` pins
it. No verdict reads RSS: the study has no checks, and `no_checks_reason` stands.
Every nominal is inside its own band.

**Checks 3, 6.** There are no `lmc`/`mmc` and no subtracted material feature in
the chain. There is no cotter or castellated hardware. The archetype's caveat is
stated beside the numbers: the ATS row is context, and compliance is unfolded.

**Check 7, traced ratio.** For this study I count **4 traced / 0 inferred /
0 untraced, out of 4 element instances** (was 2/0/2). The extra topology edge
`gas_spring_mount_datum_a_to_end_stop` is traced and is in no study. There are
no non-element values: no material, temperature or ratio. A 100% traced chain
earned extra scrutiny, which is the audit above. Two of the four nominals are
mesh fits under general-note bands, and each `note` says so. That matches the
SOP's new row and Jeff's ruling, and it is not a laundered value.

**Code.** `SourceRef.note_number` ⟺ `GENERAL_NOTE_PHRASE` is a real
bidirectional invariant with a `sheet` requirement. The `assumed` stand-in is
refused in `Topology` on a drawn part unless `no_drawing_governs` gives a reason.
The two exemptions are pinned by name. The viewer keys on `note_number`, never on
prose. The phrase reaches JS through the generated vocabulary, not a copy. The
handoff fenced "the mutation-witness runner", and `scripts/guard_enumeration.mjs`
was touched for pins only (546 → 548), which is the expected shape. Each new
guard has a spec.

**Position zone (deliverable 5).** It was not converted: neither topology states
the plate link hole's axis. I confirmed this by reading both topologies'
`pitch_plate_link_attach_bore` / `pitch_plate_link_hole`, which carry no axis.
The gap is named in both checks' `excluded_terms`, and an issue is filed. F4 is
left explicitly open. That is exactly the handoff's "do not guess" branch.

## Tests

- The tactical record holds a bridged full suite in the worktree: `1548 passed,
  1 skipped in 7m02s`. Viewer 548/548, annotate 213/213, browser 29/29, and both
  new witnesses WITNESSED. These are consistent with the diff.
- **Pre-merge risky subset**, bridged worktree (`dispatch bridge-test-inputs
  --also node_modules`): `test_general_note_band, test_end_stop_travel_study,
  test_tolerance_stack, test_topology, test_topology_projection,
  test_viewer_projection, test_kinematic, test_architecture_inventory,
  test_js_python_vocabulary, test_js_vocabulary_is_generated,
  test_viewer_readme_doc_facts, test_viewer_deep_link_contract,
  test_app_type_scale, test_mutation_witnesses, test_provenance,
  test_thermal_exception_list, test_claims_registry, test_sop_vocabulary`:
  **657 passed** in 93 s.
- I ran `scripts/rebuild_projections.ps1 -RepoRoot <review worktree>`, which
  wrote into this worktree's own `data/`, stamped `4cc72c80871f dirty=False`.
  The shared projections were untouched. Then:
  - `node apps/viewer/run_tests.cjs --repo <worktree>`: **548/548**, no SKIP
    lines, and `[real] the projection this tier reads was built from this tree`
    PASS.
  - `node apps/annotate/run_tests.cjs`: **213/213**.
  - `run_mutation_witness_tests.mjs --only` for each of the two new fast guards:
    both **WITNESSED**.
- **Post-merge full suite**, in the review worktree, bridged as above, on the
  merged tree (`venv-win/Scripts/python.exe -X utf8 -m pytest -q`):
  **1548 passed, 1 skipped in 641.70s**. That matches the tactical count. This
  repo's conftest prints no `concurrent pytest processes` / `full-suite lock`
  header lines, so I have none to quote. The main checkout's
  `git status --porcelain` was empty afterwards, so the suite wrote nothing into
  shared `data/`. Not exercised: the browser TRUTH tier and the `--full`
  mutation registry. Both are the batch merge's to run, and the main checkout's
  projections must be rebuilt at that merge. After I wrote the overlay entry and
  the issue, I re-ran the prose subset (`test_tolerance_stack, test_provenance,
  test_thermal_exception_list, test_claims_registry`): 226 passed.

## Findings

### Should-fix

1. **`export.runs` on both new 213668-002 citations lists 1 of the 5 runs that
   consumed the export.** Location: `docs/topologies/topology_vpa_pitch_linkage.json`,
   `gas_spring_mount_flange_to_end_stop` and `gas_spring_mount_datum_a_to_end_stop`.
   `runs.jsonl` has runs 0714, 0727, 0730, 0813 and 0819 on sha `dea285f5…`.
   `pitch_system`'s older citation says `runs: []`, which is the same defect from
   before this handoff. This is not fixed inline: each `ts` must be copied from
   that run's `run_meta.json`, and two of the runs predate the `inputs` key.
   Filed as `ISSUE_20261022_two_213668_export_citations_list_one_of_five_runs_that_consumed_the_export.md`,
   and added to the overlay's Recurring bugs.

### Nits (not filed)

- The 76.86 edge's note and the lesson call datum A "the part's wide base face".
  On SECTION C-C, the 76.86's lower extension lands on the 5X mounting-flange
  tabs, which the 10X Ø5 holes positioned to A go through. "Mounting-flange face"
  would be the more exact words. The edge's `from` (`gas_spring_mount_hub_face`)
  is consistent with that either way, and no study consumes it.
- `GENERAL_NOTE_PHRASE` is not re-exported from `tolerance_stack/__init__.py`.
  `PROVENANCE.md`'s `__init__` row says "a new module constant means this file
  changes", but `EXPORT_STATUSES`/`VERDICTS` are not re-exported either, so the
  rule is not actually kept. Nothing reads it.
- The chip mark reads `traced · note`. The citation card spells it out in full.
  "note" alone is terse but is the handoff's "small marker". Design judgement,
  not filed.

## Lesson audit

I re-derived the lesson's numbers: the fold table, 36 edges and 8 loops
(16 parts, 29 interfaces, one component), the fast pin 546 → 548, viewer 548,
and annotate 213. All are correct. "Notes *were* extracted for this part; only
dimensions were not" is confirmed: 12 notes on p01 and 0 dimensions.

## Verdict

**APPROVE.** No blockers. One should-fix is filed as an issue.
