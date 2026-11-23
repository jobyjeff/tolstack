# Lessons — v2 reads the pitch plate, the pitch arm and the tangential link sheets (run 2026-11-23)

Twelve open v2 edges on three drawings: ten now carry their callout, two stay
open and say what the sheet has instead. Every reading was taken off the PDF's
text layer (PyMuPDF, drawing-checker's venv) and a render read with vision; no
run's JSON carries dimensions (checked: `215735_A_p01/p02.json` hold title,
revision and notes only, and the other runs are the same shape).

## The edges, one row each

| edge | result | callout as printed | sheet, view (zone) | reading |
|---|---|---|---|---|
| `pitch_plate_pilot_to_piston_flange` | cited, ±0.05, inferred | Ø 41.040 ±0.025, ⊥ Ø0.1 A, datum B | 215735-A sh 1, front view (D8) | the boss's axis square to A within Ø0.1, half the zone about zero |
| `pitch_plate_pilot_to_piston_fasteners` | cited, ±0.15, traced | 5X Ø 5.20 ±0.10, ⌖ Ø0.3Ⓜ A B C / Ø0.1Ⓜ A B | sh 1, front view (H8) | upper segment as a radius, as v1 reads its composite 5X frame; Ⓜ growth not in the band |
| `pitch_plate_link_bushing_bores_position` | cited, ±0.015, traced | 5X Ø 8.520 ±0.008, ⌖ Ø0.03Ⓜ GⓂ, 5X INDIVIDUALLY | sh 2, SECTION A-A (B9) | coaxiality to the flanged bore (G), zone at MMC |
| `pitch_plate_link_flanged_bushing_radius` | cited, ±0.1, traced | 5X Ø 7.950 +0.015/0.000, ⌖ Ø0.2 A B C / Ø0.1 A | sh 2, SECTION A-A (B9) | the bore's place from B (pilot boss), as v1 reads this frame |
| `pitch_plate_link_flanged_bushing_bore_to_seat` | cited, ±0.025, inferred | 5X 4.06 ±0.10, ⌖ 0.2 A B C / ⊥ 0.05 G, 5X INDIVIDUALLY | sh 2, SECTION A-A (D10) | the ear's squareness to its bore, half the zone |
| `pitch_plate_tan_link_bushing_bores_position` | cited, ±0.015, traced | 3X Ø 8.520 ±0.008, ⌖ Ø0.03Ⓜ FⓂ, 3X INDIVIDUALLY | sh 2, SECTION A-A (D3) | as the 5X, to datum F |
| `pitch_plate_tan_link_flanged_bushing_radius` | cited, ±0.1, traced | 3X Ø 7.950 +0.015/0.000, ⌖ Ø0.2 A B, datum C | sh 2, SECTION A-A (C4) | the same frame and reading as v1's `pitch_plate_tan_link_attach_radius` |
| `pitch_plate_tan_link_flanged_bushing_bore_to_seat` | cited, ±0.025, inferred | 3X 4.06 ±0.08, ⌖ 0.2 A B C / ⊥ 0.05 F, 3X INDIVIDUALLY | sh 2, SECTION A-A (B4) | as the 5X ear, to F |
| `pitch_plate_link_flanged_bushing_height` (the 11-22 edge) | cited, ±0.1, traced | 5X Ø 7.950 +0.015/0.000, ⌖ Ø0.2 A B C / Ø0.1 A | sh 2, SECTION A-A (B9) | the zone's component along the plate axis from A, as v1's `pitch_plate_flange_to_link_hole` |
| `tan_link_race_bores` | cited, 61.40 ±0.05, traced | 61.40 (basic, boxed), ⌖ Ø0.1 B on Ø 14.288 ±0.006 | 213863-004-A sh 1, PART DETAIL (E7) | as v1's `tan_link_length`, which cites the same callout |
| `pitch_arm_radius` | **open** | Ø 4.826 ±0.010 (CF), ⌖ Ø0.13Ⓛ A B C, basic 50.00 from B | 215071-C sh 2, main view | the clamp face is in no frame: datum A is the arm's lug-side face |
| `pitch_arm_bore_to_clamp_face` | **open** | Ø 64.030 +0.030/0.000, ⊥ Ø0.05 A, datum B | 215071-C sh 2, main view | same: B is square to A, and A is not the clamp face |

**Where each sheet says it covers this dash.** 215735-A: sheet 1's view captions
"-001 SHOWN (CW ROTATION)/ -002 OPPOSITE (CCW ROTATION)" and note 5 (both
models); this repo's part is -001, the one drawn. 215071-C: "-002 SHOWN/-001
OPPOSITE" (sheet 2) and note 5, "ALL TOLERANCES APPLY TO BOTH COMPONENTS".
213863-004-A is 213863-004's own sheet. Each citation's export note says so.

**Which ear is the 4.06.** The ⊥ in the 4.06 frame names the flanged bore
(G, or F), and the mesh's flanged bore is 3.26 long and the straight one 2.20:
3.26 + 0.80 = 4.06 and 2.20 + 0.80 = 3.00 (the 5X 3.00 ±0.10), the two edge
breaks. So 4.06 is the ear the flanged bushing sits in. Identity only.

**Why the pitch arm stays open.** Datum A (⏥ 0.02) is the end face the side
view's frame points at, which runs the arm's full length; on the mesh the only
end face that reaches the lug is face 296 (x 76.93, to y −56). Face 250 (x
96.48, the ring only) is the clamp face ISSUE_20261117 found against the blade
root's shoulder. The sheet relates the clamp face to the bores only through A
and B, so the handoff's own rule makes both edges gaps. Filed with both ways
forward: `docs/issues/ISSUE_20261123_215071_c_datums_the_arm_from_its_lug_side_face_so_v2s_two_clamp_face_edges_cannot_take_its_callouts.md`.

## The study: which band moved, and the numbers

No reading differs from v1's, so no number moves. The three switches:

| study row | band before | band now |
|---|---|---|
| `pitch_plate_link_flanged_bushing_height` | v1 `pitch_plate_flange_to_link_hole` (±0.1) | v2's own edge (±0.1) |
| `pitch_plate_tan_link_flanged_bushing_radius` | v1 `pitch_plate_tan_link_attach_radius` (±0.1) | v2's own edge (±0.1) |
| `tan_link_length` (inline) | paired to v2 `tan_link_length` | paired to v2 `tan_link_race_bores` (same callout, same ±0.05) |

`pitch_arm_radius` still reads `pitch_arm_link_hole_to_clocking_hole` (workbook
B26, ±0.015, untraced), because the sheet did not close `pitch_arm_radius`.

From the scratch build's own output (kinematic builder), before and after:

| v2 study | before (11-22 lesson) | after (this build) |
|---|---|---|
| +72 stop: nominal / worst / RSS | 72.001 / ±0.784 / ±0.283 deg | 72.001 / ±0.784 / ±0.283 deg |
| +72 S461-261 reach | margin +1.217 | margin +1.217 |
| −7 stop: nominal / worst / RSS | −6.992 / ±2.355 / ±1.034 deg | −6.992 / ±2.355 / ±1.034 deg |
| −7 S461-261 reach | margin −0.363 | margin −0.363 |

v1's study prints the same four lines. 27 gap rows on v2, as before.

The parity test now names, per contributor, why it equals v1's
(`V2_EQUALS_V1_BECAUSE`) and keeps an empty `V2_DIFFERS_FROM_V1` for the first
one that does not. The study's `pitch_plate_tan_link_flanged_bushing_bore_to_seat`
row stays a gap, reworded: its edge's value is a squareness, the row reads a
place along the bolt (addendum on
`ISSUE_20261123_the_v2_blade_pitch_study_leaves_out_edges_that_need_a_ruling_before_they_carry_values.md`).

## Counts

v2 edges with a value: **10 → 20 of 105.** Every v2 study row now reads a v2
edge; none wears BORROWED.

## For Jeff's review page

1. 215071-C makes the pitch arm's lug-side face datum A, and the face against
   the blade root's shoulder carries no callout. Is the arm located by its bore
   and cross pin, with the shoulder face a clearance? That decides which edges
   the arm's frames belong on.
2. The pitch arm's link bore is ⌖ Ø0.13Ⓛ A B C on the drawing; the end-stop
   workbook the study still reads holds it to ±0.015 (0.03 wide), the size of
   the clocking holes' own Ø0.03. Which is the arm's real budget?
3. Three plate frames carry Ⓜ (the fastener holes, both straight-bushing
   bores). The bands are the zones at maximum material, without the growth the
   size limits allow. Filed for the SOP rule:
   `ISSUE_20261123_a_position_band_read_from_a_frame_with_a_material_modifier_leaves_out_its_bonus.md`.
4. The 5X radius and height edges are two directions of one Ø0.2 zone, the
   question v1's worksheet already raised (F4) for the same frame. v2's study
   reads only the height.

## Decisions not in the handoff

- **Zones cited for every new citation**, one printed cell each, so each crop
  centres on its callout (v1's two 215735-A citations, with no zone or a
  two-cell "B9/C4", still crop to the whole sheet). `tan_link_race_bores` cites
  E7 rather than E6 so the crop holds the frame as well as the 61.40.
- **Orientation frames are `inferred`**, as v2's flatness edge is: half an
  orientation zone as an offset is a reading. Position frames are `traced`, as
  v1's are.

## Looked at

Scratch root `data/scratch/v2_sheets\` (the 11-22
study_v2 root copied, its inbox re-mirrored from the main checkout, this tree's
`docs/`), all eight builders run from this worktree with `--data-root`
(`v2_sheets/build.sh`; crops and topology rebuilt again after the E7 change).
Served by `tests/debug_walk_merged_page_20261114.mjs` on **8894**, 1536 wide;
8000 was not used. Shots in `shots/v2_reads_the_pitch_plate_the_pitch_arm_and_the_tangential_link_sheets/`,
each read:

- `02_v2_grid_plate_rows_1536.png` — 215735-001's rows valued (±0.025, ±0.1,
  ±0.05, ±0.15; the lug group above them ±0.015, ±0.1, ±0.1, ±0.015). The grid
  panel was dragged wider to show the value columns at this width.
- `03_open_215735_pilot_to_flange_1536.png` — the opened row (0, ±0.05,
  inferred) with its crop: Ø 41.040 boxed as the match, ⊥ Ø0.1 A below it.
- `04_open_213863_race_bores_1536.png` — 61.4 / 61.35 / 61.45, crop showing
  61.40 and ⌖ Ø0.1 B. The first take showed the row under the resting
  pointer, not the selected one; the pointer was moved off and re-shot.
- `05_open_215071_pitch_arm_radius_open_1536.png` — the open pitch arm row,
  "no value", its note saying what 215071-C has.
- `06_v2_blade_pitch_study_1536.png` — the study page: no BORROWED anywhere
  (text search: zero), plate rows 79.67 ±0.1 and centre ±0.100, margins as above.

Every crop was read against the transcription: D8 (41.040, ⊥ Ø0.1 A), H8
(5.20, Ø0.3Ⓜ A B C / Ø0.1Ⓜ A B), B9 (8.520 ±0.008, Ø0.03Ⓜ GⓂ, and 7.950,
Ø0.2 A B C / Ø0.1 A), D10 (4.06 ±0.10, 0.2 A B C / ⊥ 0.05 G), D3 (8.520,
Ø0.03Ⓜ FⓂ), C4 (7.950, Ø0.2 A B, C), B4 (4.06 ±0.08, ⊥ 0.05 F), E7 (61.40,
Ø 14.288 ⌖ Ø0.1 B). Each locates by its zone with a verified text match.
Seeing the same on 8000 is for after the merge.

Seen and not changed: the study page's `pitch_arm_radius` row prints the
workbook band (centre, 0.015) while the grid's own `pitch_arm_radius` row is
"no value" — the contributor reads another edge; the pitch arm issue covers it.
The grid shows `tan_link_length` (212956-005, 61.4) and `tan_link_race_bores`
(213863-004, 61.4) both valued from one callout (addendum on the study issue).

## Jeff's binding log

`data/inbox/feature-identity\`: 116 files before and
after; the sha256 of its per-file sha256 list was `e3e9fd53…808d` at both ends.
Nothing was written there.

## Found on arrival

Nothing: the worktree was clean, and the main checkout was not worked in.

## Tests

- Default tier, worktree, `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider -rfs`:
  **2599 passed, 1 skipped, 1 failed** in 539 s (ledger: inside budget). The
  skip: `test_fit_bound_features.py:433`, a pitch-link bearing re-extraction
  not installed. The failure: `test_viewer_js_suite_is_green`, the deliberate
  worktree red (no projection under the worktree's `data/`). `-n 16` is not
  available in this venv (no xdist), so the run is single-process.
  The first full run was 3 failed: that red, `test_model_v2_locates_the_tan_link_mount_by_boss_seat_and_fasteners`
  (asserted every non-copied v2 edge says "Value to come"; now knows the ten
  read and the two left open) and the viewer suite's [real] check below.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/v2_sheets`:
  **628/628**, [real] armed. It was 627/628: "[real] v2's blade-pitch study is
  listed under v2…" still expected all six bands `other_model` and
  `pitch_link_length` borrowed — stale since the 11-23 ten-citations handoff,
  which ran the tier unarmed. Now it expects `this_model` for all six; the +72
  stop's v1 chain leaves stay borrowed, as they are.
- `node apps/annotate/run_tests.cjs`: **334/334**.
- No browser suite and no witness spec added or changed, so neither runner was
  run. The one spec whose guard body changed (`fast__real-v2-s-blade-pitch-study…`)
  mutates `apps/viewer/views/map.js`, which this branch does not touch; the
  review's `--changed-since` gate will select it from the guard hunk.
