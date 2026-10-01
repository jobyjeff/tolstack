---
type: bug
priority: high
status: open
area: topologies
reporter: agent
audience: strategy
found_by: docs/sessions/reviews/REVIEW_20260930_vpa_pitch_linkage_topology_and_feature_fits.md
---

# Two committed topologies state the pitch link's length 3.41 mm apart, on the same part, under the same edge id

Found during `review/vpa_pitch_linkage_topology_and_feature_fits` (2026-09-30).
The new topology's number is almost certainly the right one; what is filed here
is that **nothing in the repo says the other exists**, and nothing can go red
when they disagree.

## What

Two documents now carry an edge with id `pitch_link_length`, on part id
`pitch_link` (drawing `213862-002` in both), between the pitch-arm end and the
pitch-plate end of the same link:

| document | nominal | where it lives | source |
|---|---|---|---|
| `docs/topologies/topology_pitch_system.json` | **109.4 mm** at a 77° link angle | the edge's `properties.nominal_length_mm` | `260825_End_Stop_JC.xlsx`, `K3`/`K2` |
| `docs/topologies/topology_vpa_pitch_linkage.json` (new, 2026-09-30) | **105.9908 mm** | the edge's `dimension.nominal` | `250530_pitch_motion_ratios.xlsx`, sheet `250530 pitch sweep`, `C83:E83` vs `G83:I83` |

`pitch_system`'s edge runs `pitch_plate_link_hole` → `pitch_link_arm_hole`; the
new one runs `pitch_link_lower_sphere_centre` →
`pitch_link_upper_sphere_centre`. For an `MS14101-3` spherical bearing the ball
centre *is* the joint-bolt axis through the housing bore, so these are the same
hole-to-hole distance, not two different dimensions.

**It is not a pitch-condition difference either.** The new citation's own
argument — re-derived during the review — is that the length is constant across
the whole sweep: over all 80 rows (blade pitch −7° to +72°) it ranges
105.9896–105.9915, a spread of 0.0019 mm. A rigid link has one length, so the
77° link angle `pitch_system` names cannot account for 3.41 mm.

## Which one is wrong

Almost certainly `pitch_system`'s 109.4. Two independent measurements agree on
105.9908:

- the 3DX sweep sheet's own two node columns, read cell-for-cell during the
  review (`|A − P| = 105.99079988848088`);
- a fit of the installed `asm217755_MS14101_3_9bfdb344` mesh with the two
  `placement_world` matrices its own `provenance.json` records:
  `105.99056896582033`, a delta of **0.000231 mm**.

`109.4` traces to a different workbook (`260825_End_Stop_JC.xlsx`) and is
`untraced` there, carried in `properties` rather than as a dimension. Its own
note records that the row's owner was re-identified twice (2026-09-06 and
2026-09-15) and that `213862-002`'s drawing is still unacquired — so the nominal
beside the band was never re-checked when the owner moved.

## Why it matters

1. **A reader of the DAG pages gets two answers to one question** with nothing on
   either page pointing at the other.
2. **`linkage`, the solver being founded on this, takes the pitch-link length as
   source B.** The new handoff points it at 105.9908, but a reader who opens
   `pitch_system` first finds 109.4.
3. **The rule exists and this is outside it.**
   `docs/SOP_TOLERANCE_STACK.md`'s 2026-09-15 amendment: *"The same part+feature
   carries the same band in every stack that uses it … A divergence is now a
   defect; pin it with a cross-stack, value-level test naming the stacks."* The
   test that does this — `test_one_part_and_feature_folds_one_band_in_every_stack_that_uses_it`
   — reads **stack elements**, so two topology edges are outside it, and
   `pitch_system`'s nominal is in `properties` rather than in a `dimension`,
   which puts it outside any value-level pairing at all.

## Suggested fix

1. **Decide which number is right**, on the evidence above, and correct the
   loser with a dated note rather than silently. If 109.4 goes, say in
   `pitch_system`'s edge note what replaced it and why — several studies over
   that topology were built reading it.
2. **Cross-reference both ways now**, independently of (1): each document's edge
   note names the other document and the disagreement. This is the half the
   SOP amendment asks for directly ("record any you are out of scope to fix as
   a listed divergence").
3. **Extend the same-part-same-value pairing to topology edges**, including a
   nominal carried in `properties`. That is the mechanism that would have caught
   this on the day the second document was committed, and it is the same
   widening `S1` of the review asks for on
   `test_a_workbook_only_value_is_untraced_unless_its_exception_is_registered`
   — both guards stop at `STACKS_DIR` while topologies now carry dimensions
   too, so they are probably one change.
