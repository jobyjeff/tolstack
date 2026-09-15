# LESSONS — stack_title_style_pass (2026-09-14)

Retitled every stack, topology and study to a short noun phrase; added an
optional one-line `description` to all three schemas and rendered it as the nav
rail's hover tooltip; wrote the rule into the SOP and paired it with a guard.

## What the next agent could not derive from the diff

### 1. There was no `description` field. Adding one was the whole shape of the work

The handoff said "keep a `description` (or equivalent existing field)". There is
no equivalent: stacks, topologies and studies all had `title`, `notes` and
`provenance` and nothing between them. `notes` is the wrong home — its entries
are multi-paragraph reasoning written for a reviewer reading the file, and a
`title=` attribute holding one of those is worse than no tooltip.

So `description` is new on `StackDefinition`, `Topology` and `Study`: optional,
defaults to `None`, read by nothing `fold()`/`traverse()`/`summarize()` touches,
carried verbatim into both projections. That is exactly the additive-and-optional
shape `DAG_TOPOLOGY.md`'s "Versioning: additive fields stay `/v0`" already
argues for, so **no schema version moved** and no authored file that omits it
loads differently. If a future field wants the same treatment, that section is
the precedent to cite, and it now names `description` alongside `joint` and
`configuration`.

### 2. The four shapes that were actually in the data

Jeff's complaint was about the nav rail reading as a wall of text. Reading all
32 titles, the bloat was four repeatable shapes, not 32 individual judgement
calls — which is why the guard could be written at all:

1. **a genre statement** — "… as a topology" (4 of the 5 topologies). Dead
   weight now that every joint here is also a topology.
2. **a unit in parentheses** — "(degrees)", "(millimetres)", "(.125 in)"
   (13 studies). The unit is on the result; the inch length is a spec column.
3. **history or negation** — "(built from scratch, no source workbook)",
   "the configuration that slipped" (4 stacks).
4. **a bolted-on ` -- ` or `: ` clause** (most of the rest). This is the one
   worth carrying forward: *the dash is the tell*. Every over-long title here
   had one, and the text after it was always either one of shapes 1–3 or the
   description sentence already written, just in the wrong field.

`tests/test_title_style.py` enforces those four plus a 72-character cap, and
`test_the_sop_still_carries_the_title_rule` pairs the guard with the SOP section
it points at — a doc-scan guard cannot fail on a *deleted* section, so the
deletion is asserted separately (REVIEW_AGENT.md's own checklist item, applied
to my own guard).

### 3. Where shortening lost a real distinction, and what the tooltip now carries

Three cases, all resolved by keeping the distinguisher in the title and demoting
the rest — worth knowing because the naive "shorten everything" pass gets them
wrong:

- **`blade_angle_worst` vs `blade_angle_average`.** These two studies differ in
  **nothing** but the sensitivity column: same selection, same endpoints, same
  transforms. The handoff's "no sensitivity clause baked into the name where a
  shorter name + tooltip works" does **not** apply — it does not work here, and
  the sensitivity stays in both titles. The endpoints ("hub A datum to blade
  OML") and the unit went to the description.
- **The two end-stop studies** are the mirror case. `minus7`/`plus72` are
  distinguished by *which stop*, not by sensitivity, so the titles became
  "Low-pitch end stop" / "High-pitch end stop" and **both the operating angle
  and the sensitivity went to the tooltip**. A reader comparing the two now has
  to hover to see that they are computed at *different* sensitivities (worst
  case vs full-sweep average) — that is a genuine loss of at-a-glance
  information, accepted deliberately, and it is the one title pair to revisit if
  a reader is ever misled by it.
- **The nine `rotor_fastener_grip_*` studies.** The dash number (U2H … U10H) is
  already the identity, so the inch grip length went to the description. The
  rail now lists nine "Grip budget, NAS6403U…H" rows that sort correctly and
  differ in three characters, which is the point.

Two titles are now **identical to their topology's** (`Pitch link to pitch plate
grip length`, `VPA output to pitch plate grip length`, and the two take-2
names). That is intentional and is what Jeff's worked example asked for: the
topology and the stack it re-expresses *are* the same joint, and the nav nests
the stack under the topology with a "classic view" chip that does the
disambiguating. Do not "fix" this by re-introducing a genre word.

### 4. `tan_link` and `vpa_output` deliberately have no `description`

Their old titles said nothing the short ones drop. A description invented to
fill the field would be exactly the kind of plausible-sounding non-fact this
repo exists to refuse. An artifact with nothing to demote gets no tooltip, and
`views/nav.js` renders none rather than an empty one.

### 5. Four things this change reached that the handoff did not name

- **`PROVENANCE.md`.** Three of the seven stacks and `tolerance_stack/stack.py`
  are imported files, so `test_provenance` demanded an amendment row for each.
  A title-only edit still falsifies a byte-identity claim; the test says so in
  its own failure message and it is right.
- **`apps/viewer/fixtures.js` and `topology_fixtures.js`.** The node-fs tier's
  key-set drift guard fails the moment the projection writes a key the fixtures
  do not have — which is what it is for. Both fixtures gained `description`,
  **and** their own demo titles were shortened, so `?mock=1` models the rule
  rather than contradicting it. The guard only runs with `--repo` pointed at the
  main checkout (`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`);
  from a worktree it silently skips, so **pytest green is not enough for a
  projection-shape change** — run that command by hand.
- **`crops.json`.** Titles do not touch crops, but the three projections carry a
  tree stamp and the viewer alarms when they disagree. Rebuilding only
  `results.json` and `topologies.json` would have left crops on `master` and
  raised that alarm for a reader. Rebuilt it too (drawing-checker's venv, since
  PyMuPDF lives only there) so all three stamp
  `handoff/stack_title_style_pass @ 164a07b`.
- **The topology row's existing tooltip.** `views/nav.js` already put a `title=`
  on the topology row — "the whole topology, depth-first, with nothing
  highlighted" — and that sentence is the only statement anywhere of what
  clicking it does. The description goes *above* it, blank-line separated, not
  in place of it.

## The full before → after table

| file | before | after | tooltip now carries |
|---|---|---|---|
| `stack_hub_bearing_thermal_fit_m1.json` | Main spindle bearing seats, M1 as-built -- two-stage thermal shrink fit, the configuration that slipped | **Main spindle bearing seats, M1 as-built** | Two-stage thermal shrink fit, hub bore to sleeve to bearing, in the as-built M1 configuration -- the one that slipped. Kept as the control the M2 intent design is validated against. |
| `stack_hub_bearing_thermal_fit_m2.json` | Main spindle bearing seats, M2/TC intent design -- two-stage thermal shrink fit, hub bore to sleeve to bearing | **Main spindle bearing seats, M2/TC intent** | Two-stage thermal shrink fit, hub bore to sleeve to bearing, in the M2/type-certification intent design. |
| `stack_pitch_link_to_pitch_plate.json` | Pitch link to pitch plate -- grip length (built from scratch, no source workbook) | **Pitch link to pitch plate grip length** | Built from scratch with no source workbook behind it: every element is cited to a drawing or a specification directly. |
| `stack_rotor_fastener_length.json` | Rotor balance-mass bolt -- grip length (built from scratch, no source workbook; shadow exercise vs Jason Ryan's independent tolerance stack) | **Rotor balance-mass bolt grip length** | Built from scratch with no source workbook, as a shadow exercise against an independent Excel stack by a colleague -- see the worksheet's comparison section. |
| `stack_tan_link_to_pitch_plate.json` | Tangential link to pitch plate -- grip length | **Tangential link to pitch plate grip length** | -- |
| `stack_tan_link_to_pitch_plate_take2.json` | Tangential link to pitch plate -- grip length, take 2 | **Tangential link to pitch plate grip length, take 2** | The second pass over the same joint, re-read against the later assembly revision. |
| `stack_vpa_output_to_pitch_plate.json` | VPA output to pitch plate -- grip length | **VPA output to pitch plate grip length** | -- |
| `topology_pitch_link_to_pitch_plate.json` | Pitch link to pitch plate -- the grip-length joint as a topology | **Pitch link to pitch plate grip length** | The grip-length joint as a graph: 4 parts, 7 interfaces, 8 edges. It adds no value and no citation of its own -- if a number here looks wrong, the stack file is where it is wrong. |
| `topology_pitch_system.json` | Propeller pitch system -- blade-pitch position topology (L2: branches + the linear-rotary coupling) | **Propeller pitch system blade-pitch position** | The L2 deliverable: the pitch system's structure, with its branch points, its grounded loops and the one linear-rotary coupling. A structure, not an analysis -- none of its numbers should be quoted. |
| `topology_rotor_fastener_length.json` | Rotor balance-mass bolt -- grip length as a topology (nine-way grip-selection family) | **Rotor balance-mass bolt grip length** | The grip-length joint as a graph, carrying the nine-way grip-selection family as nine parallel edges with one study each. |
| `topology_tan_link_to_pitch_plate_take2.json` | Tangential link to pitch plate, take 2 -- the grip-length joint as a topology | **Tangential link to pitch plate grip length, take 2** | The take-2 grip-length joint as a graph: 4 parts, 7 interfaces, 7 edges, closing at the derived protrusion gap. |
| `topology_vpa_output_to_pitch_plate.json` | VPA output to pitch plate -- the grip-length joint as a topology (L1 proof) | **VPA output to pitch plate grip length** | The L1 proof of the topology format: a reviewed, committed grip stack re-expressed as a graph, its summation checked to the digit against what that stack already publishes. |
| `study_pitch_link_cotter_hole_clearance.json` | Cotter hole clear of the sourced clamped stack (pitch-link eye and nut geometry excluded) | **Cotter hole clearance** | Cotter hole clear of the sourced clamped stack. The pitch-link eye and the nut geometry are excluded terms. |
| `study_pitch_link_shank_out.json` | Shank out: fastener grip against the sourced clamped stack (pitch-link eye excluded) | **Shank out** | Fastener grip against the sourced clamped stack. The pitch-link eye is an excluded term. |
| `study_pitch_link_thread_region_t.json` | Thread region T: bolt overall length against the grip -- a provenance cross-check, not a design quantity | **Thread region T** | Bolt overall length against the grip -- a provenance cross-check that two independently-read NAS6403 table columns agree, not a design quantity. |
| `study_pitch_system_blade_angle_average.json` | Blade OML angular position, hub A datum to blade OML, at the full-sweep-average sensitivity (degrees) | **Blade OML angular position, full-sweep-average sensitivity** | Hub A datum to blade OML, in degrees, at the source sheet's full-sweep-average motion ratio. |
| `study_pitch_system_blade_angle_worst.json` | Blade OML angular position, hub A datum to blade OML, at the -5 deg worst-case sensitivity (degrees) | **Blade OML angular position, worst-case sensitivity** | Hub A datum to blade OML, in degrees, at the -5 deg worst-case sensitivity. |
| `study_pitch_system_end_stop_minus7.json` | Blade OML angular position at the -7 deg (low-pitch) end stop, hub A datum to blade OML, worst-case sensitivity (degrees) | **Low-pitch end stop** | Blade OML angular position at the -7 deg end stop, hub A datum to blade OML, in degrees, at the worst-case sensitivity. |
| `study_pitch_system_end_stop_plus72.json` | Blade OML angular position at the +72 deg (high-pitch) end stop, hub A datum to blade OML, full-sweep-average sensitivity (degrees) | **High-pitch end stop** | Blade OML angular position at the +72 deg end stop, hub A datum to blade OML, in degrees, at the full-sweep-average sensitivity. |
| `study_pitch_system_gas_spring_branch.json` | The gas-spring branch: pitch plate connection back to the hub A datum (millimetres) | **Gas-spring branch** | Pitch plate connection back to the hub A datum, in millimetres -- a millimetre study deliberately, because the tangential sensitivity this branch would need is not declared. |
| `study_pitch_system_gas_spring_mechanical_stroke.json` | Gas-spring mechanical stroke, full extension to full retraction (millimetres) | **Gas-spring mechanical stroke** | Full extension to full retraction, in millimetres. The gas spring's own mechanical stop, distinct from the actuator body's end-stop feature in the piston chain. |
| `study_pitch_system_vertical_hub_to_pitch_arm.json` | Vertical position of the pitch-arm link hole relative to the hub A datum (millimetres) | **Pitch-arm link hole vertical position** | Vertical position of the pitch-arm link hole relative to the hub A datum, in millimetres -- the topology's millimetre baseline, stopping at the interface just before the linear-rotary coupling. |
| `study_rotor_fastener_grip_u10h.json` | Rotor fastener grip budget, NAS6403U10H (.625 in (longest of nine)) | **Grip budget, NAS6403U10H** | Rotor fastener grip budget for the .625 in grip option, the longest of the nine. |
| `study_rotor_fastener_grip_u2h.json` | Rotor fastener grip budget, NAS6403U2H (.125 in) | **Grip budget, NAS6403U2H** | Rotor fastener grip budget for the .125 in grip option. |
| `study_rotor_fastener_grip_u3h.json` | Rotor fastener grip budget, NAS6403U3H (.188 in) | **Grip budget, NAS6403U3H** | Rotor fastener grip budget for the .188 in grip option. |
| `study_rotor_fastener_grip_u4h.json` | Rotor fastener grip budget, NAS6403U4H (.250 in) | **Grip budget, NAS6403U4H** | Rotor fastener grip budget for the .250 in grip option. |
| `study_rotor_fastener_grip_u5h.json` | Rotor fastener grip budget, NAS6403U5H (.312 in) | **Grip budget, NAS6403U5H** | Rotor fastener grip budget for the .312 in grip option. |
| `study_rotor_fastener_grip_u6h.json` | Rotor fastener grip budget, NAS6403U6H (.375 in) | **Grip budget, NAS6403U6H** | Rotor fastener grip budget for the .375 in grip option. |
| `study_rotor_fastener_grip_u7h.json` | Rotor fastener grip budget, NAS6403U7H (.438 in) | **Grip budget, NAS6403U7H** | Rotor fastener grip budget for the .438 in grip option. |
| `study_rotor_fastener_grip_u8h.json` | Rotor fastener grip budget, NAS6403U8H (.500 in) | **Grip budget, NAS6403U8H** | Rotor fastener grip budget for the .500 in grip option. |
| `study_rotor_fastener_grip_u9h.json` | Rotor fastener grip budget, NAS6403U9H (.562 in) | **Grip budget, NAS6403U9H** | Rotor fastener grip budget for the .562 in grip option. |
| `study_tan_link_take2_worst_case_protrusion.json` | Worst case protrusion: fastener grip against the effective clamped stack | **Worst-case protrusion** | Fastener grip against the effective clamped stack. |
| `study_vpa_output_shank_out.json` | Shank out: fastener grip against the clamped stack it passes through | **Shank out** | Fastener grip against the clamped stack it passes through. |

## Left undone

Nothing from the handoff's scope. One adjacent thing filed rather than fixed:
`docs/issues/ISSUE_20260914_element_and_edge_names_are_not_under_the_title_rule.md`.
