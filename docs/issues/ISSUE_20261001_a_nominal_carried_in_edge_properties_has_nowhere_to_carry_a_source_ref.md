---
type: feature
priority: med
status: open
area: topologies
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261001_one_part_feature_one_value_across_topologies.md
class: a_value_with_no_place_to_cite
---

# A nominal carried in an edge's `properties` has nowhere to put a `source_ref`, so this repo's one rule does not reach it

This repo's one rule is that every element value cites a `source_ref` and a
value with nothing behind it is `confidence: "untraced"` on the gap list.
`Dimension` carries a `SourceRef`. `Edge.properties` is an untyped
`Dict[str, Any]` and carries nothing — **no `kind`, no `document`, no `cell`,
no `confidence`**.

That is not hypothetical. `topology_pitch_system.json`'s `pitch_link_length`
carried `properties.nominal_length_mm: 109.4` for a month; it came from a
workbook that traces nothing, it was wrong by 3.41 mm, and the only places
that could say so were prose
(`ISSUE_20260930_two_topologies_state_the_pitch_link_length_3mm_apart.md`).
The corrected 105.9908 mm has exactly the same problem: it is `untraced` in
substance — a workbook plus a mesh fit, and a fit is a measurement of a mesh,
not a citation — and there is no field in which to write that word, so it is
written in a note instead and nothing reads it.

Three consequences, all live today:

1. **`properties` nominals do not reach the gap list.** `topology_gaps`
   (`scripts/build_topology_projection.py`) folds a *dimension's*
   `confidence`. An unverified nominal in `properties` is invisible to it, so
   it does not count against the traced ratio and does not appear on the DAG
   page's gap list — and the traced ratio is this repo's most valuable
   published number.
2. **The guard added on 2026-10-01 can only check `properties` nominals
   against each other.**
   `test_one_part_and_feature_states_one_nominal_in_every_topology_that_states_it`
   pairs the values, which is a real improvement; it cannot check that either
   one is cited, because there is nothing to read.
3. **The DAG page renders none of it.** The edge card reads
   `edge.dimension.source_ref` (`apps/viewer/topology.js`, `VA.edgeCard`) and
   `edge.properties` reaches the projection but no surface. A reader of the
   running app meets the band and never the nominal.

## Why this is a design question and not a fix

The obvious move — give `properties` entries a `source_ref` — collides with
what `properties` is *for*. `tolerance_stack/topology.py` is explicit that
nothing reads it and that this is deliberate: it is "the typed bag the brief
names and does not build", the place a placeholder ratio's geometry is written
down so that arriving at the real thing is an added reader rather than a
schema break. A citation-carrying `properties` is a second value channel
beside `Dimension`, and this repo's load-bearing decision is that there is
exactly one of those.

The alternatives are a real choice, not a detail:

- **Make the nominal a `Dimension`.** Blocked for `pitch_system` by its own
  `provenance.variation_only`: a single nominal-carrying dimension among
  variation bands makes a study's `nominal` total read as a position sum when
  it is not one. That document says real nominals arrive "for ALL of these
  edges at once, or in a separate topology" — which is arguably what
  `topology_vpa_pitch_linkage` already is.
- **A narrow typed slot** on `Edge` for a cited nominal, separate from both
  `properties` and `dimension`, folded by nothing.
- **Say `properties` may not hold a value a reader could mistake for a
  dimension**, and move the three length-like keys out.

Whichever wins, the rule to restore is that a number a reader can see is a
number that says where it came from.
