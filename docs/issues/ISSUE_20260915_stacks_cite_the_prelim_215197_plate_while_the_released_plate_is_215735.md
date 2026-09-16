---
type: chore
priority: med
status: triaged
area: tolerance_stacks
reporter: agent
found_by: docs/sessions/active/HANDOFF_20260915_stack_fable_audit.md
handoff: docs/sessions/HANDOFF_20260916_citation_identity_correctness.md
---

# The pitch-plate lug citations name the PRELIM 215197; the released plate is 215735-001/-002

All three grip stacks trace their 4.06 mm lug thickness to
`[PRELIM 2025-MAY-22] 215197 A.1.pdf` — the only 215197 export anywhere, over a
year old, held in drawing-checker's test fixtures. The 2026-09-15 audit found
the released design's plate is a different part number: the 215177 PITCH PLATE
ASSEMBLY's own parts list (drawing-checker run `20260813_180719`) holds
**215735-001 (CW) / 215735-002 (CCW)**, and `215735-A.pdf` is in
drawing-checker's inbox.

**The values hold.** The audit read 215735-A's text layer: it prints the same
three lug callouts — `3X 4.06 ±0.08` (p2), `5X 4.06 ±0.10` (p2), `4.06 ±0.10`
(+ datum D, p1) — so nothing folds wrong today, and this is a citation-currency
chore, not a value defect.

**The chore:** re-cite the three `pitch_plate_flange` /
`pitch_flange_thickness` elements (tan_link, pitch_link, vpa) to 215735-A —
copy the PDF into tolstack's `data/inbox/drawings/` with a PROVENANCE row, per
SOP Step 3 — and update the joint notes that say "contains the 215197 pitch
plate". The VPA element's which-feature ambiguity note carries over unchanged
(215735-A has the same two ±0.10 callouts). The audit deliberately did not do
this mid-pass: it changes what three traced citations point at across three
stacks plus their worksheets, tests and crops, which is its own reviewable
change, and the endstop-side documents already cite 215735 so the repo
currently names both numbers for one physical plate.
