---
priority: high
depends_on: [the_model_is_derived_once_and_the_left_column_is_its_tree]
model: opus
hitl: false
---

# HANDOFF 2026-11-10 — the_gas_spring_mount_sits_on_the_tan_link_mount_in_the_end_stop_model: model v2's base is a stack, hub → tan-link mount → gas-spring mount → cover

Source: Jeff, 2026-11-10, in the strategy session
(`C:\workspace\dispatch\docs\strategy\drafts\DRAFT_tolerance_analysis_over_the_kinematic_model.md`,
subsection "68 answered"). His sketch of the mechanism
(`C:\workspace\dispatch\docs\strategy\drafts\mockups\tolstack_tube_map_20261109\jeff_sketch_20261110.png`)
draws the base body as a stack — hub, the tan-link mount on it, the gas-spring
mount on *that*, the piston cover on top — with no joint from the gas-spring
mount to the hub. Asked directly whether the gas-spring mount seats on the
tan-link mount only, with no seat on the hub, he answered: **"Yes, mount on
mount."** Baseline: `integration` with
`the_model_is_derived_once_and_the_left_column_is_its_tree` merged (it renames
features in the same file and pins the model view's counts — hence the
`depends_on`). Scope: `docs/topologies/topology_vpa_end_stop_v2.json`,
`docs/DAG_TOPOLOGY.md`'s v2 section, the tests that pin v2. Do NOT touch:
`topology_vpa_pitch_linkage.json` (v1 is legacy and stays as it is, wrong seat
included); any viewer or annotator code; the sweep; other joints' constraints
(the compound joints Jeff listed are later handoffs, one joint each).

## What is wrong today

v2 seats the gas-spring mount on the hub:

- node `gas_spring_mount_hub_face`, parts `[gas_spring_mount_213668_002, hub]`,
  "gas-spring mount base face against the hub";
- hub dimension `hub_spindle_to_gas_spring_mount_face` (locating boss → that
  face);
- the mount's two dimensions that start there, `gas_spring_mount_height`
  (→ `gas_spring_mount_bushing_bore`) and
  `gas_spring_mount_hub_face_to_cover_seat` (→ `piston_cover_mount_flange_seat`).

There is no joint between the two mounts, so the tan-link mount's height is
not on the path from the hub to either end stop. That node came from the
2026-09-30 kinematic topology ("Where 213668-002 bolts to the hub"); the
dimensioned end-stop chain v1 carries from Jeff's workbook already goes the
other way, through v1's `tan_link_mount_gas_spring_seat` ("gas-spring mount
seated on the tangential link mount", parts
`[gas_spring_mount_213668_002, tan_link_mount_215175_002]`), reached by the
tan-link mount's `tan_link_mount_overall_height` (that seat → its hub face;
cited, `215198-A`) and left by the gas-spring mount's
`gas_spring_mount_datum_a_to_end_stop` (that seat, the mount's datum A, → the
feather-stop face; 76.86 ±0.1, `213668-002` A.1).

## Deliverables

1. **The seat moves.** In v2 the gas-spring mount's base face mates with the
   tan-link mount, not the hub. Use v1's id `tan_link_mount_gas_spring_seat`
   for that contact (`ids_from` says an id v1 has names the same feature).
   The hub's `hub_spindle_to_gas_spring_mount_face` goes: the hub no longer
   reaches the gas-spring mount directly. The tan-link mount gains its
   dimension from its hub seat to the gas-spring mount's seat — v1's
   `tan_link_mount_overall_height`. The gas-spring mount's two dimensions that
   started at the hub face start at the seat instead; it is the same physical
   face of the mount (its base, datum A), now mating with the right part.
   v2 stays valueless: no dimension is copied in, each edge says what would
   close it, and where v1 already cites one (the two above) the note names it.
2. **Decide, and say, what the mount's base-to-stop path is.** v2 runs base
   face → cover flange → end-stop surface in two dimensions; v1's drawing
   dimension is datum A → top face in one
   (`gas_spring_mount_datum_a_to_end_stop`, which also carries two of Jeff's
   pending face proposals). Suggestion: keep v2's two-step path if that is how
   213668-002 dimensions the cover flange, add v1's edge if the drawing
   dimensions the stop face straight from datum A — read the drawing's own
   scheme (the extracted sheets are under
   `C:\workspace\tolstack\data\inbox\drawings\` and drawing-checker's runs)
   and record which in the lesson. Do not carry both as two routes to the same
   face without saying which one a study would sum.
3. **Everything that states v2's shape agrees.** `docs/DAG_TOPOLOGY.md`'s v2
   section ("the mount through its seat on the hub", the counts and loop
   figures in its first paragraph), the topology's own `description`/`notes`,
   the declared `claim` blocks, `tests/test_topology.py`'s v2 pins, and the
   model view's value pins from the F1a handoff (the totals may not move —
   one contact and one dimension are replaced like for like — but the hub
   loses a feature and a dimension and the tan-link mount gains one of each;
   pin what is true).
4. **The ids that carry bindings and the sweep still resolve.** The P2 sweep
   names `gas_spring_mount_bushing_bore`, `hub_blade1_root_bearing_bore` and
   `hub_spindle_bore_axis` among its features and none of the ids removed
   here; no binding exists on the three edges that touched the hub face
   (measured 2026-11-10 against
   `C:\workspace\tolstack\data\projections\feature-identity\bindings.json`).
   Re-measure both after the change and put the two lines in the lesson.

## Definition of done

- v2 loads; the base body reads hub → tan-link mount → gas-spring mount →
  piston cover on the page, in that order, and the hub shows no connection to
  the gas-spring mount. Looked at on the merged tree (port 8000 serves
  `master`; serve this tree's `apps/` over the main checkout's `data/` with
  projections rebuilt from this tree): one shot of the DAG's base body, one of
  the left tree's Ground body opened to its parts and interfaces, one of the
  grid's Ground rows, at 3840×2160, in
  `docs/sessions/lessons/shots/<slug>/`.
- With the sweep playing, every part still moves with its body (nothing here
  changes membership) — one shot at each stop.
- Suites green in the main checkout per `CLAUDE.md`, projections rebuilt
  first.
- Lesson (`docs/sessions/lessons/LESSONS_20261110_the_gas_spring_mount_sits_on_the_tan_link_mount_in_the_end_stop_model.md`):
  the before and after of the base body's nodes and edges as a table; the
  item 2 decision and the drawing evidence for it; the two re-measurements of
  item 4; any other place v2 seats a part on the wrong neighbour, filed as an
  issue with `needs: jeff`, not corrected here.
