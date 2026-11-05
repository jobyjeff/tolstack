---
type: bug
priority: high
status: closed
area: viewer/[real] tier
reporter: agent
class: integration_red_real_tier
found_by: docs/sessions/HANDOFF_20261103_each_stop_is_its_own_stack.md
resolution: closed 2026-11-04 (triage): duplicate of ISSUE_20261103_the_slide_re_author_leaves_six_viewer_real_checks_red_on_integration.md, which carries the handoff and is resolved by the_viewer_real_tier_follows_the_slide_re_author (c511273a, d3a7afae)
---

# The slide re-author left six viewer `[real]` checks red on integration

`the_slide_joint_is_the_mounts_bushings_against_the_piston_body` (`b4b641db`)
re-authored `vpa_pitch_linkage` and was merged into `integration` without the
viewer `[real]` tier being run (its review says so: "Not run here: the
viewer/annotate `[real]` tiers"). Measured 2026-11-03 by the review of
`each_stop_is_its_own_stack`: `integration` at `d9eb2196`, archived into a
throwaway git snapshot under `%TEMP%`, all four projections rebuilt from it,
then `node apps/viewer/run_tests.cjs --repo <that root>` → **623/629**. The six:

| check | integration alone | integration + each_stop_is_its_own_stack |
|---|---|---|
| the pitch system's grouping is the leader rule at work … | `62 !== 61` | `63 !== 62` |
| on pitch_system, a rendered row's band tint is its own leader band's | `63 !== 62` bands | `64 !== 63` |
| every number apps/viewer/README.md states about the spine … | before-total `162 !== 160` | `223 !== 219` |
| the pitch system's five forks are marked | expected 24 branch points, got 23 | expected 25, got 24 |
| every live dot answers the SAME on hover and on click … | `pitch_plate_pilot_in_piston_id` declares `pitch_plate_215177_001`, which no incident edge carries | same |
| the topology fixture's shapes still match the builder's | nodes carry `[face, hardware_ref]`, `topology_fixtures.js` does not — regenerate | same |

The first four are layout pins the slide change moved and did not re-pin
(the right-hand column is what they read after this handoff's three nodes and
three edges, so re-pin against whatever tree is current when this is worked).
The last two are not pins:

- **`pitch_plate_pilot_in_piston_id`** declares two parts, but its only
  incident edge (`piston_body_id_datum_to_od`) carries the piston body; nothing
  incident carries the pitch plate. An authoring error in the topology, per the
  check's own words — either an edge on the plate's side is missing or the node
  should not declare the plate.
- **The node `face` field** the slide change introduced reaches the projection
  but not `apps/viewer/topology_fixtures.js` — the same class as
  `ISSUE_20261026_topology_fixtures_lack_the_tags_fields…` and
  `ISSUE_20261029_display_name_reached_the_projections_but_not_the_viewer_fixtures…`.
  Regenerate the fixture (its header says how).

**Why `high`: a red fast tier disarms the fast half of the mutation-witness
tier for every merge after it.** The same review's
`run_mutation_witness_tests.mjs --changed-since integration` on the merged
tree reported every one of its 23 `fast__` entries `NOT WITNESSED (the tier
was red before the mutation, so nothing was proved)`. That included the
handoff's own new guards. Only the `python__` and `browser__` entries could
witness. Until these six are green, no review can witness a fast guard on
`integration`.

`each_stop_is_its_own_stack` was landed on top of this without fixing it
(file-don't-fix: none of the six is that handoff's). Its own branch was
629/629 against its own base.

## Addendum 2026-11-04 (coaxial_ends_share_one_3d_node, round 2): the six reds blind the fast-tier witnesses

With the `[real]` tier armed by projections rebuilt from the merged tree (the
main checkout's is refused as built from an older tree), the viewer fast tier
is `627/633`. These same six checks are the only reds. So
`run_mutation_witness_tests.mjs --changed-since integration` reports every
fast-tier entry it reaches as NOT WITNESSED ("the tier was red before the
mutation"). On that branch the entries were
`fast__hovering-a-mark-on-either-tier-reports-its-one-key-draws__594a769a`,
`fast__one-selection-lights-its-leaders-on-both-overlays-a-node__9e0c6dde`
and `fast__the-scene-s-pointer-on-a-joint-lights-every-node-it-stan__7a922e8e`.
All three guards pass unmutated in that run. Until these six are fixed, no
branch touching `apps/viewer/` can witness a fast-tier entry on the gate.
