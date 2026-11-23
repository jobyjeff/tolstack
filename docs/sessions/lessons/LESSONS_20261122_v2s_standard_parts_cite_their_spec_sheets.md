# LESSONS 2026-11-22 — v2s_standard_parts_cite_their_spec_sheets

Four of the 22 open edges on v2's standard parts now cite a spec sheet; the
other 18 stay open and say what the sheet gives instead. v2 edges with a
dimension: **20 before, 24 after** (105 edges). The log gained three events and
its first correction.

## What was found that the handoff did not predict

- **Event 0006 had H and W swapped for MS14101-3.** Page 21's header order is
  B, D, H, W, A and the -3 row reads `.1900 | .5625 | .218 (5.54) | .281 (7.14)
  | .293`; 0006 recorded 7.14 as `width_H` and 5.54 as `ball_width_W`. The
  figure agrees with the headers (W is the overall width, H the narrower one
  inside it). MS14103-3 on page 22 was read correctly. Event 0009 is the log's
  first correction: the wrong numbers stay on `superseded`. Nothing consumed
  the swapped fields (grepped), but the inner-race-width edge is exactly the
  one that would have. Without this reading the pitch link's race width would
  have been cited as 5.54.
- **The fold cannot add a subject to a document by correction** (`correction`
  raises on a subject no earlier event established). NAS6403U14D therefore
  needed a `full` event restating all of 0001. Event 0007 does, and
  `test_the_nas6403_restatement_carries_event_0001_unchanged_but_for_what_it_adds`
  pins every carried entry equal to 0001's. Only three things were added to
  carried entries (below). If this recurs, a loader change that lets an
  additive event name new subjects is the better fix; not done here (outside
  scope), filed as an issue.
- **NAS6403 sheet 2 note (e) is "Shank straightness: within BB values TIR per
  inch of length"** and note (d) is concentricity; 0001 had read neither. BB for
  NAS6403 is .0040 in (sheet 1 second table; NAS6404/05 share a merged .0030).
  It is recorded (`shank_straightness_rule`, `concentricity_rule`,
  `shank_straightness_BB` on U11D and U14D) but it is a **rate**, not a band: the
  sheet does not say over which length, and the bolt edges' spans are not the
  sheet's to give. So the four bolt edges stay open.
- **NAS77 od_D is `inferred`**: two `*` footnotes compete (one under D, +.000/-.0005;
  a stray one under B, +.000/-.0020, with no starred B value). The edges do not
  cite D.
- The figure prints D as `+.0000/+.0010` and the table header as `+.000/-.0010`.
  Both recorded as printed.
- The two NAS77 PDFs **do not disagree**: `RBC - Plain bearings (NAS77 p92).pdf`
  page 94 is the 2008/2011/2016 edition of the same page; compared by text line
  and by eye, only the page number (92/98) and the copyright line differ. One
  event, on `JB_NAS77.pdf`, says so in `document_meta.duplicate`.

## One row per edge

| edge (×2 for pitch_link / tan_link unless named) | outcome | what cites it / what the sheet gives instead |
|---|---|---|
| `*_upper_inner_race_width` | **cited** | MS14101-3 (pitch) / MS14103-3 (tan) `ball_width_W`, event 0009: 7.14 [7.09, 7.14] / 11.10 [11.05, 11.10]; RBC sheet 21 / 22, column W header +.000/-.002 in |
| `*_flanged_bushing_flange_thickness` | **cited** | NAS77A3-015A `flange_thickness_F`, event 0008: 1.575 [1.445, 1.575]; JB_NAS77 sheet 1, F +.000/-.005 in (+.00/-.13 mm) |
| `pitch_link_lower_outer_race_od_to_centre`, `pitch_link_upper_…`, `tan_link_lower_…`, `tan_link_upper_…` | open | sheet gives OD D (14.288 / 15.875, +.000/-.013) and no centre offset from the cylinder |
| `*_lower_inner_race_bore_to_ball`, `*_upper_inner_race_bore_to_ball` (4) | open | sheet gives bore B (4.826, +.000/-.013), no ball-to-bore concentricity |
| `*_upper_inner_race_face_to_ball` | open | sheet gives ball width W and no centre position; centre at W/2 would be a derivation |
| `*_flanged_bushing_wall` | open | B and D banded separately; no concentricity or wall band (NAS77 absence `od_to_bore_concentricity`) |
| `*_flanged_bushing_bore_to_flange` | open | F and H given; no squareness (NAS77 absence `flange_face_squareness_to_bore`) |
| `*_bolt_shank_straight_to_race`, `*_bolt_shank_race_to_flanged` (4) | open | shank D .1895/.1890 and straightness BB .0040 in TIR per inch; a rate with no stated length |

## Two diameters per gap edge, and what is on file

Lug stacks (per lug; the pitch link and the tangential link each have one):

| gap edge | diameter 1 | diameter 2 |
|---|---|---|
| `*_flanged_bushing_press_fit` | bushing OD: NAS77A3-015A `od_D` 7.965 (event 0008, **inferred**, star-footnote ambiguity) | plate hole: 215735-A sheet 2 has Ø7.950 +0.015/0.000 (B9, C4) and Ø8.520 ±0.008 (B9, D3); which hole seats this bushing is an identification call not made here |
| `*_straight_bushing_transition_fit` | 214820-002 OD: **not looked up** (drawing not in the library; this handoff did not open it) | plate hole, as above |
| `*_bolt_in_flanged_bushing` | bolt shank: NAS6403U11D / U14D `shank_dia` .1895/.1890 in (event 0007, traced) | bushing bore: NAS77A3-015A `bore_B` 4.826 +.038/-.000 mm (event 0008, traced) |
| `*_bolt_in_straight_bushing` | bolt shank, as above | 214820-002 bore: not looked up |

Four bearings (two on each link):

| gap edge | diameter 1 | diameter 2 |
|---|---|---|
| `*_outer_race_press_fit` | race OD: MS14101-3 `od_D` 14.288 (-.013) / MS14103-3 15.875 (-.013), event 0006, traced | housing bore: tan link 213863-004-A E7 Ø14.288 ±0.006 is cited on `tan_link_race_bores`; the pitch link's 213861/213862 bores not looked up |
| `pitch_link_lower_inner_race_on_pitch_arm`, `tan_link_lower_inner_race_on_mount` | race bore: `bore_B` 4.826 (+.000/-.013), event 0006, traced | pitch arm bore (215071-C) / mount bore (215175): not looked up |
| `*_upper_inner_race_on_bolt` | race bore, as above | bolt shank, as above |
| `*_ball_joint` (spherical) | the sheet prints no ball diameter, only the bore and the width; this is a centre coincidence, not a two-diameter fit | — |

The "not looked up" cells are what a successor checks first; nothing here claims
they are absent from the pile.

## Model's part number against the sheets

- Model and Enovia say NAS77**A**3-015A; the STEP names its instances
  NAS77**C**3-015. The sheet decodes the letter after NAS77 as the **material**
  (A aluminium bronze 642, S 4130, C CRES 17-4PH, B beryllium copper); same
  B, D, F, H for size 3 in either. So A3 and C3 differ by material only, on this
  sheet. That is the answer to the question's first half; which is on the aircraft
  is still Jeff's (D4).
- The trailing **A** of `015A` is not decoded by the sheet (absence recorded).
  The intro lists aluminum coating as a finish but gives no code.
- Nothing contradicts MS14101-3 / MS14103-3 or NAS6403U11D / U14D. The hardware
  entry for NAS6403U14D (grip .875, length 1.198) agrees with the new event.

## Decisions not in the handoff

- Bands use the sheet's printed mm column (e.g. F min 1.575 − .13 = 1.445), not
  inches converted (1.448). Stated in the citation note.
- Three crop regions and three page contexts were recorded
  (`scripts/record_spec_crop_region.py`, each previewed): RBC 21 and 22 `-3`
  rows, `NAS77A3 row`, and each sheet's figure-plus-table context.
- Tests that pinned prose: `test_model_v2_locates_the_tan_link_mount…` required
  "Value to come" on every open v2 edge; it now has a third class
  (`V2_LEFT_OPEN_BY_THEIR_SPEC_SHEET`, notes start "Open. ") and the four cited
  edges (`V2_CITE_THEIR_SPEC_SHEETS`).

## Looked at

Scratch root `data/scratch/v2s_cites/` (main checkout; copied from `v2_sheets`,
specs inbox re-mirrored, all eight builders run from this committed tree with
`--data-root … --allow-older-tree`), served by
`tests/debug_walk_merged_page_20261114.mjs` on **8896**, 1536 wide (never 8000).
Shots in `shots/v2s_standard_parts_cite_their_spec_sheets/`:

- `02_…inner_race_width_tall_1536.png`: the pitch link's race width row opened,
  "traced · dimension", nominal 7.14, min…max 7.09…7.14, the sheet-21 crop with the
  `-3` row boxed.
- `03_…flange_thickness_1536.png`: the bushing flange-thickness row opened, same shape.
- `04`/`05`: the crop PNGs themselves, read at full size: `.281 7.14` under W with
  `+.000,-.002 / +.00,-.05` above it; `0.062 1.575` under F with
  `+.000,-.005 / +.00,-.13`. Digits match the transcription.

## Left for others

- Additive events (new subject on an already-read document) need a fold feature;
  filed: `docs/issues/ISSUE_20261122_the_fold_cannot_add_a_subject_to_a_read_document_without_restating_it.md`.
- How a gap edge carries two cited diameters as one band is the next design
  (the handoff's own fence). The tables above are its input.
- A per-inch straightness rate has no home in an edge's min/max; filed with the issue above.

## Verified

`venv-win/Scripts/python.exe -X utf8 -m pytest -q` (main checkout's interpreter),
**in this worktree**: 2607 passed, 1 failed, 1 skipped, 4 deselected, 499.88 s
(8m20s, inside the 10 min budget). The one failure is
`tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the documented
worktree red (the node-fs `[real]` tier has no projection here); it was red
before this change too. Not run in the main checkout: the viewer `[real]` tier
and the browser tier need main's projections, and `apps/` is untouched.
`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 527/528, one tier
skipped (node-fs, stale main projection); `node apps/annotate/run_tests.cjs`: 334/334.
No guard was added, so no witness spec was added or run.
