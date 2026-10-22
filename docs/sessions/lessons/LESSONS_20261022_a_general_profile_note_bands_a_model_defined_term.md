# Lessons — a_general_profile_note_bands_a_model_defined_term (2026-10-22)

## The fold, before and after

| | 2026-10-20 | 2026-10-22 (this handoff) | handoff expected |
|---|---:|---:|---:|
| nominal | 64.440 | **64.440** | 64.440 |
| worst case | ±0.170 (64.270–64.610) | **±0.820 (63.620–65.260)** | ±0.82, 63.62–65.26 |
| RSS | ±0.0889 | **±0.5616** | about ±0.56 |

It matches exactly, with nothing to explain. The two general-note bands (±0.25 and ±0.5) are
0.75 of the 0.82. The worst-case top end, 65.26, is above the ATS's ≤ 65 mm row. That row is
recorded as context only (`provenance.context_only`), beside Jeff's ruling 4 on compliance,
quoted verbatim and marked unverified.

## What the drawings actually say

- 214698-002 A note 6: `⌓0.5 UNLESS OTHERWISE SPECIFIED.`, extracted verbatim by run
  `20261020_134240_214698-002-A`, and visible on its `page_1.png`.
- 213668-002 A.1 note 12: the 2026-08-19 run extracted its text as
  `1 UNLESS OTHERWISE SPECIFIED`, with the profile frame's symbol dropped. Notes *were*
  extracted for this part; only dimensions were not. The symbol was read off `page_1.png`.
- 76.86 ±0.10 is SECTION C-C on 213668 sheet 1. Datum A is on the wide base face (flatness 0.1,
  side view). The new edge `gas_spring_mount_datum_a_to_end_stop` reads that face as
  `gas_spring_mount_hub_face`. That is a reading of the views, and the edge's note says so.
  The edge closes a ring with the mount's two other edges, which is fine because no study
  selects it.
- The export sha256s re-hash equal to each run's `run_meta.json` input.

## Decisions not in the handoff

- **A machine field, not only a phrase.** The handoff said validation should accept a
  citation "whose `note` begins with the general-note phrase". I added
  `SourceRef.note_number` and made it and the phrase (`GENERAL_NOTE_PHRASE`, stack.py) a
  bidirectional invariant. The viewer keys on the field and never on prose. That is the repo's
  "honest note, wrong machine field" lesson, applied up front.
- **The retired stand-in rule had two more hits.** The rule refuses an `assumed` band on an
  edge whose part has a `drawing`. Two `pitch_system` edges would have tripped it:
  `vpa_mount_to_end_stop_feature` (the VPA drawing is in no inbox) and
  `pitch_plate_flange_to_brake_attachment` (the brake is a concept). Turning them into gaps
  would move five pitch-system studies, so I added an explicit `no_drawing_governs` reason
  field instead. A test pins exactly these two exemptions. The re-shape question is filed:
  `ISSUE_20261022_two_pitch_system_placeholders_are_exempted_not_reshaped_under_the_general_note_rule.md`.
- **The card would have said it twice.** The hover card's new line and the note's opening
  words said the same thing. The card now shows the note from after the phrase. The phrase
  reaches JS through `vocab.gen.js` (a new `GENERAL_NOTE_PHRASE` registry row), not a JS copy.

## Viewer sites

Changed:
- the topology grid row's confidence chip (`traced · note`, and its citation card gains the
  line);
- the edge preview pane's chip;
- the stack element table and detail chips;
- `VA.citationWhere` (adds `general note N`), which reaches every where-line;
- `VA.citationCard`.

The study totals rows update by construction. Shot:
`docs/sessions/shots_20261022_a_general_profile_note_bands_a_model_defined_term/`.

Render nothing today:
- the DAG rails, which draw bars coloured by confidence and print no band;
- the kinematic page's contributor rows, whose row model carries no `source_ref`, and no
  kinematic contributor cites a general note.

Crops: the note-12 crop locates the note by its text. Note 6 and the 76.86 fall back to the
full sheet, which is honest but not pointed.

## Position zone: not converted, gap recorded

Neither topology states the axis of the plate's link hole (`pitch_plate_link_attach_bore`,
`pitch_plate_link_hole`), so the axis was not guessed. The band stays. The second in-plane
component is named in both checks' `excluded_terms`, and the contributor note says why. The
brief's +0.002° / +0.005° delta is **not** re-measured. Filed:
`ISSUE_20261022_the_pitch_plate_link_hole_has_no_axis_so_its_position_zone_stays_a_band.md`.
The source issue (which this handoff resolves) gains an addendum pointing there. **F4 of
`WORKSHEET_endstop_vision_baseline.md` stays open.** It is Jeff's call, and that issue carries
it.

## Guards and pins that moved

- `tests/test_end_stop_travel_study.py`: new numbers, all four terms traced, the general-note
  anchors, and the 76.86 edge staying out of the selection.
- New `tests/test_general_note_band.py`.
- `docs/DAG_TOPOLOGY.md` counts: 36 edges, 12 branch points, 8 loops.
- `apps/viewer/README.md`: crossings 309 → 314 before-side, rail allocations 13 → 14 over 11.
- `PROVENANCE.md` stack.py row.
- Two fast mutation specs, both WITNESSED with `--only`.
- `scripts/guard_enumeration.mjs` fast pin 546 → 548.

## How the tiers were run, and how long

- In this worktree, after `dispatch bridge-test-inputs --also node_modules C:/workspace/tolstack .`.
  The bridge linked six inputs plus venv-win. As at the 2026-10-21 merge,
  `data/inbox/feature-identity` was `present` (README only).
- Then `scripts/rebuild_projections.ps1 -RepoRoot <worktree>`, which built the projections
  **into the worktree's own `data/`**, from the committed tree (dirty=False). The shared
  projections were untouched.
- Viewer JS: 548/548. Annotate: 213/213. Browser: 29/29 checks. One sub-check SKIP:
  crop lightbox, "no live topology row reaches a declared-region crop with a highlight". That
  is unrelated and data-driven.
- Full pytest, bridged: `venv-win/Scripts/python.exe -X utf8 -m pytest -q` gave
  **1548 passed, 1 skipped in 7m02s**. The skip is `test_fit_bound_features.py:422`, "the
  2026-10-01 re-extraction of the pitch-link bearing is not installed". That one is
  data-driven and predates this handoff.
- The first worktree run (no bridge) took 12m16s, 276 s of which was one
  `test_browser_runner` setup waiting for the browser slot. It was red only on the
  deliberate viewer-JS skip, plus one real miss: the `PROVENANCE.md` stack.py row, since
  amended.
- The 119 links were removed after the run: links only, and the main checkout's inbox
  counts are unchanged.
- Not run: the full mutation registry (`--full` is the merge's), and any of the main
  checkout's projections (deliberately untouched). Rebuild them at the merge.
