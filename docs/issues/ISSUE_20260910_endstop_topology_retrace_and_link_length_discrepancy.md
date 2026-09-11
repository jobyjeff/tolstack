---
type: chore
priority: med
status: open
area: docs/topologies, docs/tolerance_stacks
reporter: agent
audience: strategy
---

# Endstop topology needs a retrace pass for §11's findings, and one finding is a Jeff question

Handoff `endstop_piece_part_acquisition` (2026-09-10) re-traced ten
`WORKSHEET_endstop_vision_baseline.md` rows against the last four piece-part
drawings and the two MS14101/MS14103 spherical-bearing spec sections (new
§11). That handoff's scope named the worksheet and the spec library, not
`docs/topologies/topology_pitch_system.json` — so the topology's own
`source_ref`s for the affected edges (`pitch_link_length`, `tan_link_length`
if it exists as a separate edge, `tan_link_mount_height`) were deliberately
**not** updated this session, unlike the 2026-09-06 precedent
(`retrace_update_20260906`) which did update the topology after a worksheet
retrace. Two things for whoever picks this up:

## 1. Retrace the topology's edges against §11

- `tan_link_mount_height`: §11b traced this to `215198-A.pdf` sheet 1,
  `79.00 ±0.10` — exact value and band match to the topology's existing
  `min: -0.10, max: 0.10`. Safe to add a real `source_ref` (`kind: "drawing"`,
  `confidence: "traced"`), same shape as the 2026-09-06 update did for
  `hub_blade_root_seat_position`.
- `pitch_link_length`: §11a derived a worst-case **0.10 mm** band from
  `213863-004-A.pdf`'s `⌀0.1` true-position callout — a *derived*, not
  directly-printed, band, so `confidence: "inferred"` (not `"traced"`) is
  the right label per the SOP's inferred/traced distinction, with the
  position-to-linear derivation spelled out in the note (already written out
  in §11a; can be copied). **Do not update the band's numeric `min`/`max`
  without also resolving item 2 below.**

## 2. F12 (§11a): a Jeff question, not resolved by this session

The topology's `pitch_link_length` edge carries `properties.nominal_length_mm:
109.4`, sourced from the workbook. `213863-004-A.pdf` — confirmed as the
correct owner via an exact, non-round shared reference dimension
(`(81.43)`, appearing on both this piece part and its assembly,
`212956-005-A`) — has an actual hole-center **basic** dimension of only
**61.40 mm**. Two readings, either of which could be right:

- The workbook's 109.4 mm is itself untraced and this drawing (the real
  owner) supersedes it as a finding, the same shape as F8/F9's band
  disagreements but on a nominal instead.
- `pitch_link_length` and `tan_link_length` (rows 31 and 52) name two
  *different* physical links in the real mechanism, and only one of them is
  actually `213863-004` — in which case the 2026-09-04 lesson's "one
  physical anti-rotation-link part, reused for both positions" reading
  (which this session did not re-derive, only relied on) needs a second
  look.

Needs Jeff or a CAD cross-check, not a documentation fix — hence
`audience: strategy`.

## 3. Row 62's hypothesis now has counter-evidence, not confirmation

§11e: `214723-002` (the 2026-09-04 hypothesis for
`pitch_plate_flange_to_gas_spring_bushing`) has an outer bore
(`⌀12.320 ±0.015`) close to `215198`'s own DETAIL B housing bore
(`⌀12.290 ±0.010`, a plausible press fit) — suggesting this bushing seats in
the **tangential-link attachment lug**, not at any gas-spring interface. Not
a confirmed refutation (the proximity is circumstantial), but the row should
not keep being scored against this hypothesis without flagging that it has
grown weaker, not stronger, since 2026-09-04.

## 4. Row 59 stays `candidate`

`215198-A.pdf` sheet 2's `DETAIL B: TANGENTIAL LINK MOUNT FEATURES, 3 PLACES`
carries several plausible SIZE dimensions (`⌀12.290 ±0.010`,
`⌀13.1 ±0.1`, `⌀9.000 +0.015/0.000`) and nothing on the sheet says which one
the workbook's row 59 means. A future session with a clearer read of the
workbook's own row-59 comment (if any) could close this.
