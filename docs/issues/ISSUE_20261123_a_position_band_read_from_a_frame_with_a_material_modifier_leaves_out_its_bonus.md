---
type: feature
priority: low
status: deferred
area: SOP/GD&T readings
audience: strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_v2_reads_the_pitch_plate_the_pitch_arm_and_the_tangential_link_sheets.md
class: domain_rule_awaiting_strategy
defer_until: 2026-12-25
resolution: deferred 2026-11-25 (triage) -- low, deferred by default
---

# A position band read from a frame with a material modifier leaves out its bonus

The SOP's table "What a term cites when its drawing does not band it" reads a
position zone ⌖ Øw as a radius w/2. It says nothing about Ⓜ or Ⓛ. Three v2
edges cited on 2026-11-23 carry one, and each carries the zone as printed — the
zone at maximum material — with the growth named in its citation note and not
in the band:

| v2 edge | frame (215735-A) | band | zone at the far size limit |
|---|---|---|---|
| `pitch_plate_pilot_to_piston_fasteners` | 5X Ø 5.20 ±0.10, ⌖ Ø0.3Ⓜ A B C | ±0.15 | Ø0.5 at Ø 5.30 |
| `pitch_plate_link_bushing_bores_position` | 5X Ø 8.520 ±0.008, ⌖ Ø0.03Ⓜ GⓂ | ±0.015 | Ø0.046 at Ø 8.528, plus a datum shift up to 0.015 (G is Ø 7.950 +0.015/0.000) |
| `pitch_plate_tan_link_bushing_bores_position` | 3X Ø 8.520 ±0.008, ⌖ Ø0.03Ⓜ FⓂ | ±0.015 | as above, datum F |

215071-C's link bore (⌖ Ø0.13Ⓛ A B C on Ø 4.826 ±0.010) is the same question
the other way round, should that bore be cited later.

A worst-case stack that keeps the zone at MMC understates the spread whenever
the feature is not at MMC. The size limits are printed, so the bonus is
derivable without inventing anything; whether a stack should carry it (worst
case: the largest zone; or the zone at MMC with the size as its own term) is a
rule for the SOP, made once. Recommendation: carry the largest zone the
printed limits allow, say so in the note, and add a row to that SOP table.
None of these three edges is a contributor of a study today, so no published
number moves either way.
