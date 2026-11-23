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

STOP_TABLE_PLACEHOLDER

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

LOOKED_PLACEHOLDER

TESTS_PLACEHOLDER
