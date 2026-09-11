# BRIEF 2026-09-11 — endstop topology retrace: §11 findings need a topology pass, and F12 needs Jeff

Filed by triage 2026-09-11 from
`docs/issues/ISSUE_20260910_endstop_topology_retrace_and_link_length_discrepancy.md`
(chore, med, `audience: strategy`) — routed to strategy rather than a
tactical handoff because item 2 below is a Jeff/CAD question that gates part
of item 1, and the issue explicitly forbids updating the affected band
numbers before it is answered.

## What the issue holds (read it; it carries the traced values)

`endstop_piece_part_acquisition` (2026-09-10) re-traced ten worksheet rows
against the four acquired piece-part drawings and the MS14101/MS14103 spec
sections (worksheet §11), but its scope excluded
`docs/topologies/topology_pitch_system.json` — so the topology's own
`source_ref`s were deliberately not updated, unlike the 2026-09-06 precedent
(`retrace_update_20260906`).

1. **Mechanical half (tactical once unblocked):** add a `traced` drawing
   `source_ref` to `tan_link_mount_height` (§11b: `215198-A.pdf` sheet 1,
   `79.00 ±0.10`, exact band match) — safe now; and an `inferred` ref for
   `pitch_link_length`'s derived 0.10 mm band (§11a, position-to-linear
   derivation already written out) — but do NOT move that band's numeric
   `min`/`max` until item 2 resolves.
2. **The F12 question (HITL — needs Jeff or a CAD cross-check):** the
   topology's `pitch_link_length` carries `nominal_length_mm: 109.4` from
   the workbook, while `213863-004-A.pdf` — confirmed as the correct owner
   via the shared `(81.43)` reference dimension with `212956-005-A` — shows
   a hole-center basic of **61.40 mm**. Either the workbook's nominal is
   untraced and the drawing supersedes it, or rows 31 and 52
   (`pitch_link_length` / `tan_link_length`) name two different physical
   links and the 2026-09-04 "one physical link, reused" reading needs a
   second look. This decides whether the topology's nominal moves.
3. **Row 62's hypothesis has counter-evidence** (§11e: `214723-002`'s bore
   pairs plausibly with the tangential-link lug, not a gas-spring
   interface) — the row should stop being scored against the 2026-09-04
   hypothesis without a flag that it weakened.
4. **Row 59 stays `candidate`** until someone reads the workbook's own row-59
   comment against `215198-A.pdf` sheet 2's DETAIL B candidates.

## What strategy should produce

A handoff for item 1's safe half (and items 3/4's worksheet flag updates)
with the F12-gated part explicitly fenced out, plus the F12 question queued
for Jeff (HITL exception block per the handoff template) — don't block the
safe half on the answer.
