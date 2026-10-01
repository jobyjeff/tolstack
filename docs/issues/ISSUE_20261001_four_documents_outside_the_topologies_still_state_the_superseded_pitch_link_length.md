---
type: chore
priority: med
status: open
area: topologies
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261001_one_part_feature_one_value_across_topologies.md
class: one_fact_written_twice
---

# Four documents outside `docs/topologies/` still state the pitch link's superseded 109.4 mm, and one open brief's argument rests on it

`topology_pitch_system.json`'s `pitch_link_length` nominal was corrected
109.4 mm → 105.9908 mm on 2026-10-01
(`ISSUE_20260930_two_topologies_state_the_pitch_link_length_3mm_apart.md`).
That handoff's scope was `docs/topologies/` and the cross-stack pairing tests,
so the sites below were enumerated and deliberately not touched. Filed rather
than noted, because the handoff's ownership of them ends at Complete.

The new guard,
`test_one_part_and_feature_states_one_nominal_in_every_topology_that_states_it`,
reads **topology documents only**. None of the rows below are inside it.

| site | what it says | disposition proposed |
|---|---|---|
| `docs/tolerance_stacks/WORKSHEET_end_stop_graft.md` lines 85, 88 (`K3`, `K6`) | `109.4` as the workbook's own cell values | **Leave.** This is a transcription of `260825_End_Stop_JC.xlsx`, and the workbook really does say 109.4. Changing it would falsify the record. |
| `docs/tolerance_stacks/WORKSHEET_endstop_vision_baseline.md` §11a, finding **F12** | 109.4 mm vs `213863-004`'s basic `61.40` mm "cannot both describe the same physical distance", raised as an open **Jeff question** with two readings | **Re-disposition.** F12's second reading — "`pitch_link_length` and `tan_link_length` name two different physical links and only one of them is `213863-004`" — is the one the 2026-09-30 evidence supports: the pitch link is `213862-002`/`213861-002` and measures 105.9908 mm sphere-centre to sphere-centre, so `61.40` belongs to the other link. Neither 109.4 nor 61.40 is the pitch link's length, which is a cleaner answer than F12 could reach. |
| `docs/strategy/BRIEF_20260911_endstop_topology_retrace_and_f12.md` lines 44, 48 | quotes `nominal_length_mm: 109.4` as current | Dated brief; update or annotate when F12 is re-dispositioned — it is the same finding. |
| `docs/strategy/BRIEF_20260916_link_name_authority.md` lines 35–36 | ties `properties.nominal_length_mm: 109.4`, 77° link angle, to `212956-005` | **The live one.** This brief is **open**, and part of its argument is built on the superseded figure. Its subject (which name owns which link) is untouched by the correction, but a reader picking it up meets a number the tree no longer carries. |
| `docs/tolerance_stacks/AUDIT_20260915_full_pass.md` line 77 | dated audit record naming the `pitch_link` identification | **Leave.** A dated record of what was true on 2026-09-15. |

## Also unchecked, and the same class

The `77 deg` `link_angle_deg` sitting beside the corrected nominal in the same
`properties` bag is `K2` of the same workbook K-block that produced the wrong
`K3`, and it was never re-checked when that row's owner was re-identified
either. Unlike the length it has **no second measurement to check it against**,
so this handoff flagged it in the edge note and corrected nothing. The 3DX
sweep sheet carries node coordinates, not a link angle, and "link angle"
relative to what is not stated anywhere — resolving it needs a decision about
the reference, which is why this is `audience: strategy` rather than a tactical
row.
