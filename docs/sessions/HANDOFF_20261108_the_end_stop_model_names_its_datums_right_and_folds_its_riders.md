---
priority: code-red
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-08 — the_end_stop_model_names_its_datums_right_and_folds_its_riders: model v2's bodies hold every part that moves with them in Jeff's reading order, the hub and plate datums are named for what they locate, the phantom hub–plate edge goes, and the tan-link mount gets its compound datum

Source: Jeff's live walk of the merged M1 page, strategy session 2026-11-08
evening (demo tomorrow afternoon, 2026-11-09 — this is the critical path;
**correct but incomplete beats complete and wrong**). Baseline: trunk `master`
at `e601a681` (M1 merged) plus `integration`; three handoffs are in review
(`the_bindings_projection_folds_the_events_jeff_accepted`,
`the_pane_seek_witness_points_at_the_comparison_the_page_now_makes`,
`the_rail_suggestion_check_counts_what_the_rail_is_meant_to_show`) — merge
`integration` before you measure. Scope: `docs/topologies/topology_vpa_end_stop_v2.json`,
`scripts/build_topology_projection.py` (the walk's body and part order only),
`tolerance_stack/topology.py` only if a field needs it, `tests/`,
`docs/DAG_TOPOLOGY.md` ("Models" and "Bodies"). Do NOT touch
`topology_vpa_pitch_linkage.json`, anything under `apps/` (two sibling
handoffs own the viewer and the scene and launch after you merge), the
kinematic study loader or the play transport.

**Ids are frozen; names are not.** Every node and edge id in v2 that v1 also
has is shared on purpose (`ids_from`, `DAG_TOPOLOGY.md` "Models"): the P2
sweep `C:\workspace\tolstack\data\inbox\linkage-sweeps\vpa-pitch-p2-20261105-204957.json`
binds `geometry.features[]` by node id, and Jeff's bindings are keyed by edge
id. Change `name`, `note` and `description` freely; never an `id`.

## What Jeff saw on the merged page (2026-11-08, 1920 wide)

The DAG and grid walk the bodies top to bottom as: base (hub, **gas-spring
mount, tan-link mount** — so the hub→tan-link-mount edge jumps over the
gas-spring mount), tangential link, pitch plate (plate, piston), **lower head
as its own body**, **upper head as its own body**, **cover as its own body**,
pitch link, blade. The hub's rows say "spindle axis to blade-1 root bearing
axis", "spindle bore axis to tangential link mount seat", "spindle bore axis to
gas-spring mount seat"; the plate's say "spindle axis to pitch-link bore
radius". His words: *"Need to stop calling everything a spindle, the only
spindle is the main bearings in the hub that the entire prop rotates about
(the spindle/shaft is not even in this model). Technically the spindle axis of
the hub doesn't even enter into this tolerance stack."*

## Deliverables

1. **Riders fold into their bodies.** `pitch_plate.parts` =
   `[pitch_plate_215177_001, gas_spring_piston_214700_002, piston_head_lower_214699_002, piston_head_upper_214698_002]`
   in that order (Jeff: *"the piston head components are rigidly attached to
   the piston, so they are part of the same rigid body. The sequence goes:
   pitch plate, piston, lower piston head, upper piston head"*). `base.parts` =
   `[hub, tan_link_mount_215175_002, gas_spring_mount_213668_002, piston_cover_214958_002]`
   in that order (*"the hub, the tangential link mount, the gas spring mount,
   the piston cover, in that order"*). Delete the three rider bodies from v2.
   `rides_with` stays in the schema and in v1 — only v2 stops using it. The
   linkage pairing test (`tests/test_topology.py::test_the_mechanism_bodies_are_linkages_own`)
   already has the mechanism for this: extend
   `BODY_PARTS_LINKAGE_DOES_NOT_LIST_BY_TOPOLOGY[MODEL_V2.stem]` with
   `base: {piston_cover_214958_002}` and
   `pitch_plate: {piston_head_lower_214699_002, piston_head_upper_214698_002}`
   (the 11-05 reason for riders — "folding them widened the product model's
   walk by a column" — was measured on v1's 40-part graph and does not bind a
   15-part one; say so in `DAG_TOPOLOGY.md`'s rider paragraph in one sentence,
   and keep the rider rule for v1).
2. **Body order is the loop's reading order.** `bodies[]` in the file:
   `base, tan_link, pitch_plate, pitch_link, blade`. The walk draws bodies in
   the file's order and, inside a body, parts in the body's `parts` order —
   the authored JSON is the layout authority, so Jeff can re-order by editing
   it. Suggested direction (investigate, report feasibility in the lesson):
   in `build_topology_projection.py`, start the walk at the first body's first
   part's first node and make `next_deferred` prefer the earliest authored
   body not yet started, then the earliest authored part in the current body,
   rather than the most recently started body; v1 must render exactly as
   before, so either the rule is a no-op on v1's authored order or v1's
   `bodies[]`/`parts` are re-ordered to match what it draws today (pin a v1
   dump before you start — `node tests/debug_model_v2_shots.mjs --dump-v1
   <file>` writes the rails SVG and grid rows as markup; `cmp` them after).
   The issue this answers in part:
   `docs/issues/ISSUE_20261108_model_v2s_five_body_dag_draws_a_column_not_a_loop.md`,
   option (a).
3. **Names say what the datum locates; "spindle" leaves v2.** Keep every id.
   - node `hub_spindle_bore_axis` → name "hub locating-boss axis (tan-link
     mount pilot)"; note: concentric with the spindle by design, the spindle
     and shaft are not in this model.
   - node `pitch_plate_spindle_bore_axis` → "pitch plate piston-locating boss
     axis" (the gas-spring / piston axis).
   - edges: `hub_blade_axis_offset` → "locating-boss axis to blade-1 root bore
     axis"; `hub_spindle_to_tan_link_mount_face` → "locating-boss axis to
     tan-link mount seat"; `hub_spindle_to_gas_spring_mount_face` →
     "locating-boss axis to gas-spring mount seat";
     `pitch_plate_attach_radius` → "piston-boss axis to pitch-link bore
     radius"; `pitch_plate_tan_link_attach_radius` → "piston-boss axis to
     tan-link bore radius".
   - A value-level test over v2 alone: no `name`, `title`, `description` or
     `note` in `topology_vpa_end_stop_v2.json` contains the word "spindle"
     (case-insensitive). The wrong outcome it stands on is dated 2026-11-08
     (Jeff's sentence above); it fires on one data file and the agent editing
     it pays — a test, not a runtime guard. v1 keeps its words.
4. **The phantom hub–plate edge goes.** Delete
   `hub_to_pitch_plate_spindle_coaxiality` from v2: the plate is located
   through the piston (`pitch_plate_pilot_in_piston`), the piston through the
   mount's bushings (`pitch_plate_slide_bushings_to_piston_body`), the mount
   through its seat on the hub. The hub's axis enters the stack nowhere. The
   sweep's "214373-002 driver 215177-001" joint is linkage's kinematic
   abstraction (the travel DOF), not a tolerance edge; the two nodes stay
   (the sweep names both) and the lesson says this in two sentences. Jeff's
   binding on that edge id lives in v1's log and is untouched.
5. **The tan-link mount's compound datum.** Jeff: *"the top face of the hub
   mounts to the tan link flange, and it is located radially by the circular
   boss on top of the hub, and the mount's rotation is constrained by the
   fasteners around the perimeter."* Today the mount has one row (seat →
   attachment bore). Add: a node on the mount for its pilot bore (locates on
   the hub's boss) and a `gap` edge from `hub_spindle_bore_axis` to it with
   the pin-in-bore interface; a structural edge inside the mount from the
   pilot bore to the attachment bore (the radial location of the bore); and
   the clocking constraint by the perimeter fasteners as one node on both
   parts with whichever interface word the vocabulary already has for a
   bolted clocking (read `docs/DAG_TOPOLOGY.md` "The vocabularies"; if none
   fits, add the word in Python and regenerate `vocab.gen.js` — never an
   inline literal). All new edges carry no `dimension` and a `note` saying
   what would close them (v2's convention). **Do not** give the gas-spring
   mount the same treatment — Jeff has not said so; list it in the lesson as
   the open question it is.
6. **Docs.** `DAG_TOPOLOGY.md` "Models": v2's row says five bodies, no riders,
   and the ordering rule in one sentence; `CLAUDE.md` needs no change.

## Definition of done

- Projections rebuilt in the main checkout (`scripts/rebuild_projections.ps1`),
  page served at `http://127.0.0.1:8000/tolstack/viewer/topology.html?topology=vpa_end_stop_v2`
  (drawing-checker's mount is up; `ops.toml`'s `serve` on 8843 is the
  fallback): **the DAG and the grid read top to bottom** base (hub, tan-link
  mount, gas-spring mount, cover) → tangential link → pitch plate (plate,
  piston, lower head, upper head) → pitch link → blade; the hub→tan-link-mount
  edge lands on the row below the hub's; no body contains a part that is not
  in its `parts`; no row says "spindle". Screenshot at 1600 and 2560 wide,
  **looked at by you before you write the lesson** (Jeff: *"make sure the
  agents use vision to actually look at the rendered page"*).
- v1's rails SVG and grid markup are byte-identical before and after (the
  `--dump-v1` method above), or the lesson shows the one deliberate difference.
- The P2 sweep still plays on v2 from the 3D pane (pane says v2, "20 of 20
  parts placed" or the new count, the cover moves with the base, the heads
  with the plate).
- Fast tier, `node apps/viewer/run_tests.cjs`, `node apps/annotate/run_tests.cjs`,
  `node scripts/run_viewer_browser_tests.mjs` green in the main checkout;
  `node scripts/run_mutation_witness_tests.mjs --changed-since integration`
  witnessed; the linkage pairing test green on both models.
- Lesson (`docs/sessions/lessons/LESSONS_20261108_the_end_stop_model_names_its_datums_right_and_folds_its_riders.md`):
  the two screenshots; every rename old → new; the removed edge and why; the
  new nodes/edges with their interface words; the walk-order rule as
  implemented and what it did to v1; the gas-spring-mount question.
