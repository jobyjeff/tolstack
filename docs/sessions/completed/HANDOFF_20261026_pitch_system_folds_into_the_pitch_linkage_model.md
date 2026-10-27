---
priority: high
depends_on: [the_tangential_link_cites_its_drawing]
model: opus
hitl: false
---

# HANDOFF 2026-10-26 — pitch_system_folds_into_the_pitch_linkage_model: one topology is the product, and it declares its rigid bodies

Source: strategy session 2026-10-26. Jeff, walking the kinematic study: "What
I was hoping for was one unified DAG based model, where subsets (linear
chains) were selected for individual studies, and then sensitivities were
derived from the 3d kinematic model … the intent is that all of the studies
are just subsets of a single global model representing the actual product."
Today four of the kinematic study's six contributors take their band from an
edge of a *different* topology (`dimension_ref` → `pitch_system`), which is
why clicking them "jumps to separate associated models". Baseline: `master`
after the 2026-10-22 batch merge, plus `the_tangential_link_cites_its_drawing`
merged (it edits the same topology file). Scope: `docs/topologies/`
(`topology_vpa_pitch_linkage.json`, `topology_pitch_system.json`, the seven
`study_pitch_system_*.json`, the kinematic study, `part_mesh_aliases.json`),
`tolerance_stack/topology.py` + `kinematic.py` (bodies, loader rules),
`scripts/build_topology_projection.py` / `build_kinematic_projection.py` /
`generate_js_vocabulary.py` registry, `docs/DAG_TOPOLOGY.md`, `tests/`,
`ARCHITECTURE.md`, `CLAUDE.md` pointers. In `apps/` you may edit **only**
what the merged projection would otherwise make throw at load, each site
named in the lesson — the kinematic page and the annotator rail are owned by
two sibling handoffs staged today (`the_kinematic_page_keeps_the_dag_and_says_each_contributor_once`,
which depends on this one, and `the_rail_and_the_scene_point_at_each_other`).

## Why now, and not later

`feature-identity/v0` bindings key on `{topology_id, edge_id}`, and
`C:\workspace\tolstack\data\inbox\feature-identity\` holds only its README
(the one binding ever written was deleted 2026-10-21). Every id change after
Jeff's first binding sitting costs a correction event per binding; today it
costs nothing. Jeff binds after this lands, on the merged model.

## What is true today (measured 2026-10-26)

| topology | parts | nodes | edges | studies |
|---|---|---|---|---|
| `vpa_pitch_linkage` | 16 | 29 | 36 | 1 chain (`travel_between_end_stops`) + 1 kinematic (`blade_pitch_at_the_stops`) |
| `pitch_system` | 12 | 21 | 24 | 7 chain (`blade_angle_average`, `blade_angle_worst`, `end_stop_minus7`, `end_stop_plus72`, `gas_spring_branch`, `gas_spring_mechanical_stroke`, `vertical_hub_to_pitch_arm`) |

Eight part ids are shared (`hub`, `pitch_plate_215177_001`, `pitch_link`,
`pitch_arm`, `blade_root`, `gas_spring`, `gas_spring_mount_213668_002`,
`tan_link_mount_215175_002`); `pitch_system` alone has `vpa_208510_007`,
`vpa_piston`, `ring_gear`, `hydraulic_brake`. Both topologies carry a
`pitch_link_length` edge, kept value-equal by the
`one_part_feature_one_value_across_topologies` guard (2026-10-01; its lesson
§4 lists what reads `pitch_system`'s copy). `pitch_system`'s values are the
answer key's shape with placeholders (9 assumed, 9 workbook, 6 drawing of 24,
per `DRAFT_tolerance_analysis_over_the_kinematic_model.md`); the 2026-10-22
`a_general_profile_note_bands_a_model_defined_term` handoff re-shaped most
stand-ins and left two exempted (`ISSUE_20261022_two_pitch_system_placeholders_are_exempted…`).
The brake (`hydraulic_brake`, `hub_top_deck_to_brake_mount`,
`hydraulic_brake_body_height`) is the alternative architecture to the gas
spring and sits in `pitch_system` as a parallel branch; Jeff's 2026-10-16
ruling: a note for now, no `variant` schema slot until brake geometry exists.

The sweep artifacts (`C:\workspace\tolstack\data\inbox\linkage-sweeps\vpa-pitch-p2-20261016-235852.json`)
name rigid bodies — `base` (ground: `hub`, `tan_link_mount_215175_002`,
`gas_spring_mount_213668_002`), `pitch_plate` (`pitch_plate_215177_001`,
`gas_spring_piston_214700_002`), `blade` (`blade_root`, `pitch_arm`) — and
two-force links `pitch_link` (`pitch_link`, `spherical_bearing_pitch_link`)
and `tan_link` (`tan_link_212956_005`). Those lists live in linkage's
`C:\workspace\linkage\linkage\vpa.py` (`BODY_PARTS`, `LINK_PARTS`, named
against this repo's part ids). Nothing in tolstack declares a body; the
annotator's sweep rail reads them off the artifact, and the DAG cannot draw
a body because the topology does not know one exists
(`ISSUE_20261020_the_sweep_rail_cannot_show_a_bodys_internal_dimension_chains.md`).

## Deliverables

1. **One topology.** Every `pitch_system` part, node and edge not already in
   `vpa_pitch_linkage` is added to it, ids preserved; where the same physical
   feature exists under two ids (`pitch_link_length` is the known one — sweep
   for others by part + feature, the 10-01 lesson §3 did this across the
   corpus) the `vpa_pitch_linkage` id wins and the `pitch_system` studies'
   selections are re-pointed. Every id linkage names in
   `geometry.features[]` (60 entries, run P2 above) stays byte-identical; the
   kinematic `[real]` tier and linkage's own pairing test are the proof. The
   seven `pitch_system` studies become studies of `vpa_pitch_linkage`
   (`topology:` field, selection ids), file names unchanged except the
   topology prefix if the SOP's naming rule requires it.
   `topology_pitch_system.json` is **deleted** (git keeps it; the alias
   table's rows that cite it re-point). The merged document's `title` is the
   product's — the viewer's nav groups studies under it, so the group label
   is read by Jeff: say the product, not "linkage".
2. **The kinematic study's `dimension_ref`s collapse to same-topology refs.**
   The loader already accepts `{topology, edge}`; after the merge all four
   name `vpa_pitch_linkage`. Keep cross-topology refs legal in the schema (a
   fastener-length topology may still lend a band) but the kinematic page's
   "jump to another model" goes away for this study because there is no
   other model.
3. **The topology declares its rigid bodies.** A `bodies[]` list on the
   topology document — `{id, name, parts[], kind: body | link}` — carrying
   exactly linkage's `BODY_PARTS` + `LINK_PARTS` for the five, and one body
   per static part set the mechanism does not know (`ring_gear`, the VPA
   parts, `hydraulic_brake` — name them honestly, e.g. `hub_statics`, not a
   guessed mechanism role). Python owns the shape (`tolerance_stack/topology.py`,
   a `Body` type with validation: every part in exactly one body, every
   body's parts exist); a pairing test compares the five mechanism bodies to
   `linkage/vpa.py` when the sibling is on disk, the way
   `LINKAGE_JOINT_ROW_NAMES` is compared to `linkage/joints.py`. The topology
   projection carries `bodies[]` through, and the kinematic projection
   carries each contributor's body. **The DAG does not draw bodies in this
   handoff** — the sibling kinematic-page handoff lights edges, and body
   containers are a design handoff still to be staged — but the projection
   is what both will read, so its shape is decided here and written into
   `docs/DAG_TOPOLOGY.md` (new section, "Bodies") beside the node and edge
   vocabulary. Linkage switching its `BODY_PARTS` to read this file is a
   linkage handoff, later; note it in the lesson.
4. **Every pinned count follows.** Node and edge counts are declared in
   `claim` fences and pinned in tests (the 10-20 lessons record which README
   and comment digits moved and which did not); `EDGE_KINDS`, `NODE_KINDS`
   are unchanged. `data/projections/parts/names.json` rows whose `source` was
   `topology: pitch_system` re-derive. The three retired-stand-in exemptions
   and the two VPA facts issue (`ISSUE_20261016_two_vpa_part_facts_the_pitch_stacks_wait_on.md`,
   rows 38/39 of the old file) carry over by edge id — update the issue's
   file references, do not resolve it.
5. **Docs.** `docs/DAG_TOPOLOGY.md`'s examples and its "What v0 cannot do"
   list where the merge changes an answer; `docs/SOP_TOLERANCE_STACK.md`'s
   topology-first framing gains one sentence: one topology per product,
   studies are subsets of it. `CLAUDE.md`'s "Read these" bullet for
   graph-shaped work points at the bodies section.

## Definition of done

- `pytest -q` green in the main checkout; `node apps/viewer/run_tests.cjs`,
  `node apps/annotate/run_tests.cjs`, `node scripts/run_viewer_browser_tests.mjs`
  green against projections rebuilt from the committed tree (the 10-20
  lessons' scratch-data-root recipe); mutation specs `--only` for every guard
  touched.
- The viewer's nav shows one model group with nine chain studies and one
  kinematic study under it, every study's numbers unchanged to three decimals
  from before the merge (pin the seven `pitch_system` studies' totals before
  you start and assert them after — the merge moves ids, never values).
- `topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`'s
  four referenced bands resolve inside the one topology (the row's band
  source names no second model).
- The annotator's sweep rail on run P2 still reads every joint feature
  (`?sweep=vpa-pitch-p2-20261016-235852`), proving the ids linkage names did
  not move.
- Lesson (`docs/sessions/lessons/LESSONS_20261026_pitch_system_folds_into_the_pitch_linkage_model.md`):
  the id-collision table and which side won each, the before/after count
  table, every `apps/` line you had to touch and why, and the `bodies[]`
  shape as implemented (linkage's follow-up handoff is written from it).
