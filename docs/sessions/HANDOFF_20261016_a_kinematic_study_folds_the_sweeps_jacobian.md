---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-10-16 — a_kinematic_study_folds_the_sweeps_jacobian: the first tolerance study over the kinematic model, blade pitch at the two end stops

Source: Jeff's forge note `20261016T144810_kk46rp` ("# tolstack", 2026-10-16)
and the 2026-10-16 strategy session that answered it. Baseline: `master` after
the 2026-10-15 batch merge (`03ed055`), which carries
`parts_sit_where_the_assembly_puts_them` and `a_context_filter_and_a_view_filter`.
Scope: a new module `tolerance_stack/kinematic.py`, a new document kind under
`docs/topologies/`, the projection builder that emits it, tests, and the two
docs named below. Do NOT touch `docs/topologies/topology_vpa_pitch_linkage.json`
or `docs/topologies/part_mesh_aliases.json` (a parallel handoff,
`the_travel_between_the_end_stops_is_a_study`, adds parts and edges there), do
NOT touch `apps/` (no viewer or annotator change in this handoff), and do NOT
touch `tolerance_stack/topology.py`'s `traverse()` / `summarize()` /
`check_study()` or their guards.

## Why this exists, in one paragraph

tolstack's topology archetype is fenced "not a solver": a study is a
human-lassoed chain and the code refuses to choose a branch. That fence is
right for a clamped stack and wrong for a mechanism, whose parallel paths are
settled kinematically, not by the author. The solver lives in `C:\workspace\linkage`,
and since 2026-10-15 its published run **P2** carries, at every one of its 80
sweep points, the derivative of every measure with respect to every geometry
parameter. That table is a sensitivity, which is exactly what a `Term.coefficient`
is. This handoff makes a **kinematic study**: a document that names a published
sweep, one measure, and a set of toleranced contributors, and folds the sweep's
Jacobian row through the one `fold()` at every sweep point. The fence survives
untouched: nothing here solves, it reads a cited artifact. **Nothing new may
combine element values.** Deriving a coefficient is permitted (the thermal
archetype derives `1 + ΔT·α`); summing contributions anywhere but `fold()` is
not. If a reviewer reads any line as a second combiner, declare it in
`DECLARED_COMBINING_EXCEPTIONS` with the argument, rather than leaving it
undeclared.

## The input, pinned

`C:\workspace\tolstack\data\inbox\linkage-sweeps\vpa-pitch-p2-20261015-013931.json`
(gitignored; absolute path, read-only). Schema `linkage-sweep/v1`. The keys this
handoff reads, measured 2026-10-16:

| key | shape |
|---|---|
| `geometry.names` / `geometry.values` | 60 parameter labels and their nominal values, e.g. `pitch_link.length`, `pitch_link.point_a[0]`, `tan_link.length`, `plate_slide.axis_a[1]`, `actuator.value` |
| `measures.names` / `measures.units` | `blade_pitch` deg, `actuator_travel` mm, `motor_angle` deg, `plate_rotation` deg |
| `sensitivity.parameters` | the same 60 labels, in Jacobian column order |
| `sensitivity.by_measure[<measure>]` | a list of 60 lists of 80: `by_measure["blade_pitch"][j][i]` is ∂blade_pitch/∂parameter_j at sweep point i, in deg per mm for every length-like parameter |
| `points[i].driver_value`, `points[i].measures` | 80 points; index 0 is driver 64.466 mm at blade pitch −7°, index 79 is driver 0 at 72° |
| `sensitivity.finite_difference_checks`, `sensitivity.max_finite_difference_disagreement` | 2.4e-7 worst; cite it in the study's provenance |
| `mechanism` | the joint list with each joint's two body names; it is how you tell `point_a` (body a) from `point_b` (body b) |

**The two stops** are the points whose `measures.blade_pitch` is nearest −7
and +72. Find them by value, never by index.

Which end of `pitch_link` is the plate: tolstack's topology says
`pitch_plate_link_joint` runs `pitch_plate_link_attach_bore ->
pitch_link_upper_sphere_centre` and `pitch_arm_link_joint` runs
`pitch_arm_link_bore -> pitch_link_lower_sphere_centre`. Read the artifact's
`mechanism` block to learn whether linkage's `point_a` is the plate body or the
blade body and record the answer in the study's provenance. A sibling linkage
handoff (`geometry_parameters_name_their_topology_feature`) will make future
runs carry this join explicitly as `geometry.features[]`; **read it when
present, fall back to the authored labels below when absent**, and when both
exist and disagree, refuse to build with a message naming the label.

## Deliverables

1. **The document kind: `joby.tolerance_stack/kinematic_study/v0`.** One file
   per question under `docs/topologies/`, loaded by `tolerance_stack/kinematic.py`
   (stdlib only, like its siblings; add its row to `ARCHITECTURE.md`'s module
   inventory, which a test pairs against the tree). Fields:
   - `id`, `title`, `description` (the SOP's "Titling an artifact" rule applies);
   - `topology`: the topology the contributors' edges belong to;
   - `sweep`: `{ "run_id": "vpa-pitch-p2-20261015-013931", "schema": "linkage-sweep/v1" }`
     resolved under `data/inbox/linkage-sweeps/` (the annotator's own
     `linkageSweepsDir`); a missing run is a load-time refusal naming the path,
     never an empty result;
   - `measure`: one of the artifact's `measures.names`;
   - `contributors[]`: each names a **topology edge** (`edge`), the linkage
     **parameters** it perturbs (`parameters`, one or more labels), a **zone**
     (`band` for one parameter, a half-width along that parameter; `sphere` for
     a point's three coordinates, a radius; `disk` for two tilt components, a
     radius, allowed by the schema but not needed by the first study), and
     **where the band comes from**: either `dimension_ref`-style,
     `{ "topology": "<id>", "edge": "<id>" }`, resolved out of that topology's
     edge `dimension` at load time with its `source_ref` and confidence carried
     unchanged (the L1 proof pattern: no number is copied), or an inline
     `dimension` with its own `source_ref`;
   - `checks[]` and `no_checks_reason`: the same shapes `Study` already has;
     a check with a `limit` folds exactly two terms through `fold()` as
     `check_study` does today, applied **at a named stop**
     (`configuration.stop`), never to the whole sweep at once;
   - `provenance`, `notes`.
2. **The fold, per sweep point.** For each contributor build one `Term`:
   `Dimension` = the band about a nominal of `0.0` (variation-only, the
   `pitch_system` convention), `sign` = the sign of the Jacobian entry for a
   `band`, `+1` for a `sphere`/`disk` (symmetric), `coefficient` = |J| for a
   `band` and the Euclidean norm of the entries over the zone's parameters for a
   `sphere`/`disk` (the support function of a ball, the closed form for "the
   worst azimuth"; say so in the module docstring). Then `fold(terms)`. The
   result per point is an `Interval` (worst case and RSS); over the sweep it is
   an **envelope**: for every point, `driver_value`, the nominal measure, worst
   min/max, RSS. Also per point: the ranked **contributor table**, rows ordered
   by |coefficient × half-band| descending, each with the edge, the parameters,
   the zone, the Jacobian entries, the band and its confidence. A contributor
   whose band cannot be resolved (no `dimension` anywhere) is a **gap row** on
   that table and contributes no term; the study's result says how many rows
   are gaps. The cite-or-gap rule is unchanged: nothing is invented.
3. **The first study, `kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`:**
   `topology: vpa_pitch_linkage`, `measure: blade_pitch`. Contributors, with
   the bands that exist today (all in `topology_pitch_system.json`; every one
   of them is `workbook`/`untraced` or `drawing` as noted, and the study carries
   that honestly):

   | contributor edge (vpa_pitch_linkage) | linkage parameters | zone | band from |
   |---|---|---|---|
   | `pitch_link_length` | `pitch_link.length` | band | `pitch_system` / `pitch_link_length`, ±0.03 (workbook, untraced) |
   | `pitch_arm_radius` | the blade-side pitch-link point, 3 coordinates | sphere | `pitch_system` / `pitch_arm_link_hole_to_clocking_hole`, ±0.015 (workbook, untraced) |
   | `pitch_plate_attach_height` | the plate-side pitch-link point, its component along the spindle axis only (CAD Z; `linkage.constants.SPINDLE_AXIS`) | band | `pitch_system` / `pitch_plate_flange_to_link_hole`, ±0.1 (drawing, traced) |
   | `tan_link_length` | `tan_link.length` | band | **no band anywhere** → a gap row |
   | `tan_link_mount_height` | the mount-side tangential-link point, its spindle-axis component | band | `pitch_system` / `tan_link_mount_height`, ±0.1 (drawing, traced) |
   | `pitch_plate_tan_link_attach_radius` | the plate-side tangential-link point, 3 coordinates | sphere | **no band anywhere** → a gap row |

   Mapping a `pitch_system` edge onto a `vpa_pitch_linkage` edge is a judgement
   (the two topologies name the same physical dimensions differently); write
   each pairing's reason in the contributor's `note`. If a pairing above is
   wrong on inspection, change it and say so in the lesson rather than forcing
   it. **Deliberately excluded**, named in `checks[].excluded_terms`: the
   end-stop location itself (where the driver's zero sits is the parallel
   handoff's study, `the_travel_between_the_end_stops_is_a_study`; its total
   will enter this study later as a `band` on `actuator.value`, whose Jacobian
   entry is the motion ratio), the gas-spring bushing tipping (a `disk` on the
   plate slide's axis components; the Jacobian for it exists in P2 but no
   clearance band is cited anywhere yet), temperature, and every geometric
   callout. Checks: at each stop, S461-607's ±0.5° (copy the `limit` and
   `context_ref` blocks verbatim from
   `docs/topologies/study_pitch_system_end_stop_plus72.json` /
   `_minus7.json`), `complete: false`, verdict rendered as a budget.
4. **The projection.** Emit kinematic studies into the topology projection
   (`scripts/build_topology_projection.py`, or a sibling builder registered in
   `scripts/projection_provenance.py` and inventoried; your call, say why):
   per study the envelope, the two stops' contributor tables, the check
   results, the sweep's `run_id`/`pipeline_commit`/`max_finite_difference_disagreement`,
   and the gap rows. Plus **one evidence plot per study**, visualization-first:
   an SVG of the envelope versus driver value, nominal line, worst-case band
   shaded, RSS band inside it, the two stops marked and labelled with their
   worst-case numbers, the limit drawn where a check has one. matplotlib is
   not in `venv-win` and is not to be added; write the SVG by hand the way the
   repo's other hand-rolled SVGs are written (look at how `apps/viewer` draws
   the DAG and reuse its type scale from `apps/viewer/style.css`'s `:root`
   values, never restating them). Put it beside the projection
   (`data/projections/topology/kinematic/<study id>.svg`) and copy it into
   `docs/sessions/lessons/shots_20261016_<slug>/` for the lesson.
5. **The docs.** A new section in `docs/DAG_TOPOLOGY.md`, "A kinematic study
   reads its sensitivity from a published sweep", stating the model (the
   Jacobian is a cited coefficient source; a kinematic study is not a chain;
   the fence is unchanged; which of "What v0 cannot do" this closes: item 2
   becomes expressible as a `disk` on the slide axis, item 4 is the sweep
   itself; items 1 and 3 untouched). Remember the claim-block rule: any
   checkable number you write there goes in a `claim` fence with a registry
   row, or not at all. One paragraph in `docs/SOP_TOLERANCE_STACK.md`'s
   topology-first framing pointing at the new section.

## Suggestions, not requirements

- Keep the per-point `Term` list construction in one function that takes the
  Jacobian row and the resolved contributors and returns `list[Term]`; it is
  the only new arithmetic surface and the mutation witness for it is one
  flipped sign.
- The `sphere` norm is a coefficient, not a combination of element values, but
  a reviewer may ask; the sentence to have ready is that it maps one zone to
  one `Term` and never adds two contributors.
- The 60 parameter labels are linkage-internal spellings. Tolerate exactly the
  spelling the artifact uses and nothing looser; a label the artifact lacks is
  a load-time refusal naming it.

## Definition of done

- The study above loads, folds and projects against the P2 run named above,
  run from a worktree with `--data-root C:/workspace/tolstack/data`. The lesson
  records, at each stop: the nominal blade pitch, the worst-case and RSS
  intervals in degrees, the ranked contributor table with every row's
  coefficient and band, the number of gap rows, and the S461-607 budget
  verdicts. State plainly which contributor dominates and whether the sphere
  zones changed any ranking against a band-only reading.
- Tests, value-level: a committed synthetic artifact fixture under `tests/`
  (three sweep points, two measures, four parameters with hand-chosen Jacobian
  entries) whose expected worst-case and RSS intervals are computed by hand in
  the test; a test that a `sphere` zone's coefficient equals the norm of its
  entries and a `band`'s sign follows the Jacobian; a test that an unresolvable
  band yields a gap row and no term; a test that a label the artifact lacks
  refuses to load; a test that `geometry.features[]`, when present and
  disagreeing with an authored label, refuses. A `[real]` test against the P2
  file by absolute path, skip-guarded on absence, pinning the two stops' numbers
  the lesson reports to three decimals.
- One mutation-witness spec per new guard under `scripts/mutation_witnesses/`
  (the name is derived; `node scripts/run_mutation_witness_tests.mjs --unenrolled`
  prints it). `ARCHITECTURE.md` inventory row. The one-fold claim still green.
- `venv-win/Scripts/python.exe -m pytest -q` green in the worktree except the
  documented worktree-only red; `node apps/viewer/run_tests.cjs` and
  `node apps/annotate/run_tests.cjs` unchanged in outcome (this handoff adds no
  surface to either app).
- Lesson (`docs/sessions/lessons/LESSONS_20261016_a_kinematic_study_folds_the_sweeps_jacobian.md`):
  the numbers above; which `pitch_system` edge each contributor borrowed its
  band from and why; the plate/blade side resolution of `point_a`/`point_b`;
  what the viewer will need to render this (so the next handoff is a frontend
  one and not a rediscovery); and anything in the artifact that was not what
  this handoff said it was.
