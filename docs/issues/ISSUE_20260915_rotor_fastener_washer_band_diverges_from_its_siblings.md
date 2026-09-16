---
type: bug
priority: med
status: resolved
area: tolerance_stacks
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_pitch_link_known_bands.md
handoff: docs/sessions/HANDOFF_20260916_citation_identity_correctness.md
resolution: handoff completed 2026-09-16 -- closed automatically by dispatch when handoff `citation_identity_correctness` moved to completed/; not independently verified.
---

# `rotor_fastener_length`'s NAS1149V0332 washer still folds a zero-width band while every sibling folds ±0.004 in

`handoff pitch_link_known_bands` (2026-09-15) applied the recorded
`NAS1149V0332` thickness band — `0.8128 ±0.1016` mm, from `260729_sample_tol_
stack.xlsx` cells E11/F11 — to `stack_pitch_link_to_pitch_plate.json`, under
Jeff's ruling that a sourced-but-unverified value belongs in a stack loudly
rather than omitted silently, and under the SOP Step 5b amendment of the same
date: **the same part+feature must carry the same band in every stack that uses
it.**

Three stacks use the part. Two now agree and one does not:

| stack | element | min | max |
|---|---|---|---|
| `tan_link_to_pitch_plate` | `washer_thin` | 0.7112 | 0.9144 |
| `pitch_link_to_pitch_plate` | `washer_nas1149v0332` | 0.7112 | 0.9144 |
| **`rotor_fastener_length`** | **`washer_nas1149v0332_tt`** | **0.8128** | **0.8128** |

`rotor_fastener_length` was explicitly out of scope for that handoff (*"Do NOT
touch … other stacks' JSON"*), so the divergence is recorded rather than fixed:
`tests/test_tolerance_stack.py::test_one_part_and_feature_folds_one_band_in_
every_stack_that_uses_it` lists this pair in `KNOWN_BAND_DIVERGENCES` and names
this file. That test fails if the row goes stale in either direction — if the
divergence closes, or if the pair stops existing.

## What the fix is

Apply `0.7112 / 0.9144` to `washer_nas1149v0332_tt` with the same citation
treatment the pitch-link washer now carries — `kind: "workbook"`, `document:
260729_sample_tol_stack.xlsx`, `cell: E11/F11`, `confidence: "untraced"`, the
provenance trail in the note, and the band's gap kept open in that stack's
worksheet. Then recompute the nine `grip_budget__u*` checks, repin them, and
delete the `KNOWN_BAND_DIVERGENCES` row.

Note that stack's **other** washer, `washer_ms21299c3`, is zero-width for a
different reason (MS21299 is genuinely absent, with no workbook value either)
and is **not** part of this fix.

## Why it matters beyond tidiness

This is the defect Jeff caught by eye on 2026-09-15 — one part reading `±0` on
one screen and a real band on another — reproduced one stack over. The band is
subtracted in `rotor_fastener_length`'s budget checks, so a zero-width washer
makes those nine budgets look tighter than the model can support.
