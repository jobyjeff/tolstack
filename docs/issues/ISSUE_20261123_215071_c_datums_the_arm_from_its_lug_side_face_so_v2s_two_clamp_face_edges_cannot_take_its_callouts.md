---
type: feature
priority: med
status: deferred
area: topology/v2 pitch arm
audience: strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_v2_reads_the_pitch_plate_the_pitch_arm_and_the_tangential_link_sheets.md
class: domain_rule_awaiting_strategy
defer_until: 2026-12-09
resolution: deferred 2026-11-25 (triage) -- med beyond BUDGET=3
---

# 215071-C datums the arm from its lug-side face, so v2's two clamp-face edges cannot take its callouts

v2 runs both pitch arm edges from the clamp face (`pitch_arm_root_seat`):
`pitch_arm_radius` (clamp face to link bore) and `pitch_arm_bore_to_clamp_face`
(blade root bore to clamp face). 215071-C sheet 2 (PART DETAILS) does not name
the clamp face in any frame:

| callout on 215071-C sheet 2 | what it relates |
|---|---|
| ⏥ 0.02, datum A (left side view) | the arm's flat end face that runs through the lug: mesh face 296 of `asm217755_215071_001`, at x 76.93, the only end face that reaches the lug (y to −56). Face 250, the ring-only face at x 96.48, is the clamp face that ISSUE_20261117 found against the blade root's shoulder. |
| Ø 64.030 +0.030/0.000, ⊥ Ø0.05 A, datum B | the blade root bore, square to A |
| 2X Ø 6.35 ±0.01, ⌖ Ø0.03Ⓛ A B, datum C (VIEW A) | the clocking holes |
| Ø 4.826 ±0.010 (CF), ⌖ Ø0.13Ⓛ A B C, basic 50.00 from B | the pitch link bore |
| (19.55) | the ring's thickness between the two end faces: a reference |
| note 4: untoleranced features ⌓ 0.8 | the clamp face, with no datum |

So the sheet relates the link bore and the blade root bore to the clamp face
only through datum A. Under this repo's rule (an edge whose two ends the sheet
relates only through a third feature is a gap) both edges stay open, and the
handoff that read the sheet left them open with that said in their notes. The
identification of A is a reading of the side view (the face A's frame points
at runs the full length, lug to teeth) checked against the mesh for which face
reaches the lug; it is identity only.

What would close it, for a strategy session:

1. **If datum A is the face the arm is located by** (the cross pin and the
   bore locate the arm, and face 250 is clearance, the second option of
   ISSUE_20261117): add v2 edges from the arm's datums — B (`pitch_arm_blade_root_bore`)
   to the link bore for ⌖ Ø0.13Ⓛ A B C at basic 50.00, and A to B for
   ⊥ Ø0.05 A — and have the study's `pitch_arm_radius` contributor read the first.
   That needs new edge ids, which the reading handoff was fenced from.
2. **If face 250 is the clamp face that locates it**: the drawing gives the
   clamp face no tolerance beyond note 4's ⌓ 0.8, which names no datum; the
   relation needs a callout the sheet does not have.

Either way, the study's `pitch_arm_radius` contributor today reads the
end-stop workbook's B26 (±0.015, untraced, via
`pitch_arm_link_hole_to_clocking_hole`). The sheet's frame for that bore is
⌖ Ø0.13Ⓛ A B C: a radius of 0.065 at the bore's largest size, more than four
times the workbook's. The clocking holes' own frame is Ø0.03 — the workbook's
total width — which may be where B26 came from. That comparison is for Jeff's
review page; nothing here reconciles it.
