---
type: bug
priority: med
status: deferred
area: topologies
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20261001_one_part_feature_one_value_across_topologies.md
class: a_vocabulary_restated_by_hand
defer_until: class:a_vocabulary_restated_by_hand
resolution: deferred 2026-10-01 (triage, second sweep) -- med beyond this sweep's BUDGET=3 for this repo. Not a judgement that it is unimportant; it is what the budget rule does with med past the cap.
---

# `EDGE_NOMINAL_PROPERTY_KEYS` is a hand-maintained list with nothing pairing it to the corpus, and its stated reason for excluding `nominal_stroke_mm` does not hold

`tests/test_tolerance_stack.py::test_one_part_and_feature_states_one_nominal_in_every_topology_that_states_it`
(added 2026-10-01, `one_part_feature_one_value_across_topologies`) closes a real
hole and is proven on the pair that broke. Its reach into `properties`, though,
is one hand-written tuple:

```
EDGE_NOMINAL_PROPERTY_KEYS = ("nominal_length_mm",)
```

Two separable defects.

## 1. Nothing pairs the tuple against the corpus

The topology corpus states **eight** numeric values in edge `properties` today
(re-derived at review through `load_topology`, so `dimension_ref`s resolve):

| edge | part | key | value |
|---|---|---|---|
| `pitch_link_length` | `pitch_link` | `nominal_length_mm` | 105.9908 |
| `pitch_link_length` | `pitch_link` | `link_angle_deg` | 77 |
| `pitch_arm_link_hole_to_clocking_hole` | `pitch_arm` | `pitch_arm_radius_mm` | 50 |
| `pitch_arm_link_hole_to_clocking_hole` | `pitch_arm` | `blade_root_radius_mm` | 32 |
| `gas_spring_body_height` | `gas_spring` | `bushing_vertical_separation_mm` | 34.7 |
| `gas_spring_body_height` | `gas_spring` | `pitch_link_radius_from_gas_spring_axis_mm` | 83.1 |
| `gas_spring_mechanical_stroke` | `gas_spring` | `nominal_stroke_mm` | 61.67 |
| `gas_spring_mechanical_stroke` | `gas_spring` | `equivalent_blade_pitch_travel_deg` | 75 |

One of the eight is inside the pairing. The next author who writes a second
document's nominal into `properties` under any key but `nominal_length_mm` —
`length_mm`, `nominal_separation_mm`, `nominal_mm` — reproduces
`ISSUE_20260930_two_topologies_state_the_pitch_link_length_3mm_apart.md`
exactly, and **nothing goes red**: the pairing finds no second statement and
the non-vacuity guard beside it stays satisfied by the `pitch_link` pair. The
repo's own rule for this shape is a guard that derives the set rather than
restating it — the fix is a test that enumerates every numeric `properties` key
in the corpus and asserts each is either in `EDGE_NOMINAL_PROPERTY_KEYS` or in
an **explicitly listed** exclusion set carrying its reason, so a new key is a
red that makes someone choose.

## 2. The exclusion reason is the wrong reason, and it misses a real value

The constant's comment gives the reason for the short list as: the other mm
keys "are NOT the edge's own end-to-end dimension, so pairing on them would
compare two different quantities and call the disagreement a defect."

The *mechanism* that reason describes is real but it is not what the comment
says. The pairing key is `(part, edge id)`, so two different edges can never be
compared against each other. The only way a wrong pair forms is **within one
edge**: `_edge_nominal_statements` returns one entry per matching key, so two
mm keys on one edge are compared against each other. That is a genuine hazard
for `pitch_arm_link_hole_to_clocking_hole` (50 vs 32) and for
`gas_spring_body_height` (34.7 vs 83.1) — both would self-collide.

It is **not** the situation of `nominal_stroke_mm`:

- edge `gas_spring_mechanical_stroke` runs `gas_spring_full_extension_stop` →
  `gas_spring_mount_flange` and is named *"gas spring mechanical stroke (full
  extension to full retraction)"*, so `61.67` **is** that edge's own end-to-end
  nominal — the comment's stated test for inclusion, which it passes;
- its only sibling property is `equivalent_blade_pitch_travel_deg`, which is
  degrees, so including it creates no intra-edge pair.

So the gas spring's stroke is the one value in the corpus that meets the
guard's own criterion and sits outside it anyway. `bushing_vertical_separation_mm`
is the uncertain middle case — the edge it sits on *is* "gas-spring bushing to
its mounting flange", so 34.7 may well be that edge's own length, and it is
excluded for the right mechanical reason (its mm sibling) under the wrong
stated one.

## What to do

One change serves both: an exclusion set with a per-key reason, paired against
the corpus by a guard, and `nominal_stroke_mm` moved into
`EDGE_NOMINAL_PROPERTY_KEYS` unless someone can say why 61.67 is not that
edge's nominal. Filed rather than fixed at review: it needs a new test to be
trustworthy, which puts it outside the reviewer's inline-fix boundary.

Related and deliberately separate:
`ISSUE_20261001_a_nominal_carried_in_edge_properties_has_nowhere_to_carry_a_source_ref.md`
(a `properties` nominal cannot be *cited*) and
`ISSUE_20261001_the_topology_pairing_compares_nominals_and_not_bands.md`
(the pairing compares nominals only). This one is about which `properties`
values the pairing can *see* at all.
