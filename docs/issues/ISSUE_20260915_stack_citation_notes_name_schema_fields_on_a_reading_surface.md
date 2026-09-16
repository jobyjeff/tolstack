---
type: feature
priority: low
status: triaged
area: docs/authoring
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260915_viewer_component_names_and_reference_copy.md
strategy: docs/strategy/BRIEF_20260915_prose_field_rules_names_and_derivable_counts.md
---

# Seven stack citation notes name a schema field or a checksum, and the viewer renders them verbatim

`viewer_component_names_and_reference_copy` (2026-09-15) applied Jeff's
web-copy rules to every string the **viewer** writes, and to every `name`/`note`
in `docs/topologies/*.json` — guarded by
`tests/test_topology_prose_for_a_reader.py`, which spells the pattern and the
reason for each banned shape.

It deliberately stopped at `docs/tolerance_stacks/stack_*.json`. Seven authored
strings there carry the same shapes, and all seven are rendered verbatim — in
the topology preview pane (a `dimension_ref` edge resolves its citation out of
the stack file), on the citation hover card, and in the stack-mode detail pane:

| stack | field | shape |
|---|---|---|
| `rotor_fastener_length` | `washer_nas1149v0332_tt.source_ref.note` | `source_ref` |
| `tan_link_to_pitch_plate` | `fastener_grip_13.source_ref.note` | `source_ref`, `sha256` |
| `tan_link_to_pitch_plate` | `fastener_grip_14.source_ref.note` | `source_ref`, `sha256` |
| `tan_link_to_pitch_plate_take2` | `straight_bushing.source_ref.note` | `source_ref` |
| `vpa_output_to_pitch_plate` | `pitch_flange_thickness.note` | `source_ref` |
| `vpa_output_to_pitch_plate` | `under_head_chamfer_washer.note` | `source_ref` |
| `vpa_output_to_pitch_plate` | `fastener_grip.source_ref.note` | `source_ref`, `sha256` |

## Why this is a strategy question and not a copy chore

A `source_ref.note` is **the written argument behind a value** — the thing this
repo's one rule exists to make readable, addressed to a reviewer working through
the provenance record. The topology notes this handoff rewrote were annotations
*about* a graph; these are the record itself. Two things follow, and neither is
decidable from the viewer side:

1. **Rewriting one is authoring in the value record.** "RE-SOURCED 2026-08-10
   … WAS a slice-1 transcription of workbook row 23" is a history a reviewer
   wants; naming `source_ref` inside it is how the author referred to a sibling
   citation. Rewording without re-reading the source risks changing what the
   note *claims*, which is exactly the failure mode the repo's one rule is
   against.
2. **Or the viewer should stop rendering them as body copy.** The alternative
   fix is presentational: a citation's own note is record prose, so it could
   render inside a marked "the citation's own words" block (the way a `callout`
   already does) rather than as a sentence the page appears to be saying. The
   handoff's JS guard already carves exactly these nodes out by class
   (`VERBATIM_PROSE_CLASSES`, apps/viewer/tests.js) on that reasoning — making
   the carve-out visible on screen is the un-taken half.

Pick one before anybody edits the seven. The natural carrier is whichever
handoff comes out of
`docs/strategy/BRIEF_20260909_sop_full_topology_first_restructure.md`, which is
already an authoring-side restructure — the same disposition
`ISSUE_20260914_element_and_edge_names_are_not_under_the_title_rule.md` got, and
for the same reason.

Repro: open the topology page on `vpa_output_to_pitch_plate`, click the
`fastener_grip` row, and read the citation note in the preview pane.
