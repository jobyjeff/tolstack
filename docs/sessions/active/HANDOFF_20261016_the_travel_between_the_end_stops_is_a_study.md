---
priority: med
depends_on: []
model: sonnet
---

# HANDOFF 2026-10-16 — the_travel_between_the_end_stops_is_a_study: the gas-spring hard stops join the pitch-linkage topology, and the travel between them is summed

> **⚠ INTERACTIVE EXCEPTION (HITL), 1 item:** three drawings this stack needs
> are in no inbox in the workspace (checked 2026-10-16 across
> `C:\workspace\drawing-checker\data\inbox\drawings\` and
> `C:\workspace\tolstack\data\inbox\drawings\`): **214958-002** (piston cover),
> **214699-002** (lower piston head), **214698-002** (upper piston head). At
> session start, file **one** request for all three the way
> `LESSONS_20260915_stack_fable_audit.md` filed its gaps (a forge agent-todo;
> read that lesson for the exact verb and the actor id), asking Jeff to export
> them as PDFs into drawing-checker's drawings inbox in the same filename
> style as `213668-002 A.1 MOUNT, GAS SPRING, PROPELLER.pdf`. **Don't block**:
> build everything below with mesh-fitted nominals and loudly-badged placeholder
> bands; if the drawings land while you are still running, re-cite and say so
> in the lesson; if not, the todo is the hand-over.

Source: Jeff's forge note `20261016T144810_kk46rp`, section "total linear
travel between end stops study/sub-stack", quoted below; and the 2026-10-16
strategy session. Baseline: `master` after the 2026-10-15 batch merge
(`03ed055`). Scope: `docs/topologies/topology_vpa_pitch_linkage.json` (adding,
never editing an existing node, edge or part), one new study file, one
worksheet, `docs/topologies/part_mesh_aliases.json`, and the inventory
sentence in `docs/DAG_TOPOLOGY.md` the suite re-derives. Do NOT touch
`tolerance_stack/*.py`, `scripts/`, `apps/`, or any `kinematic_study_*.json`
(a parallel handoff, `a_kinematic_study_folds_the_sweeps_jacobian`, owns a new
module and document kind and reads this topology; your additions must leave
every existing id and dimension byte-identical so its reads do not move).

## Jeff's statement of the stack (his words, 2026-10-16)

> total linear travel between end stops study/sub-stack: starting here because
> it is actually a fairly short stack and it is an input to the rest of the
> analysis. Total linear travel is just the difference between two as-built
> stacks:
>
> Piston head thickness (sum): These components must be added to the pitch
> plate/piston rigid body — Lower piston head (214699-002) thickness; Upper
> piston head (214698-002) thickness.
>
> End stop distance (difference): New components, part of the main rigid body
> (currently only the tan link mount 215198-001 is included in the kinematic
> model) — Piston cover (214958-002) length, from bottom flange to end stop
> surface (~82.154mm); gas spring mount thickness (piston cover mount flange
> to it's end stop surface), (~8.667mm).

And, from his feather-direction list: "Assuming the pitch mech is resting
against the feather direction (72deg) hard stop: bottom of lower Piston head
214699-002 (flatness only); Piston length (214700-002) ~108.669". The main
datum of the whole end-stop analysis is **the lower piston head's lower face,
in contact with the feather stop**; that is the driver's zero in the
kinematic model, and this study runs from it.

## What exists already

- `docs/topologies/topology_vpa_pitch_linkage.json` (13 parts, 24 interfaces,
  29 edges; `docs/DAG_TOPOLOGY.md` lists it) already carries
  `gas_spring_mount_213668_002` with `gas_spring_mount_height`
  (`gas_spring_mount_hub_face -> gas_spring_mount_bushing_bore`, no dimension)
  and `gas_spring_piston_214700_002` with no edges of its own. Nothing names
  the piston heads or the piston cover.
- Installed meshes in `C:\workspace\tolstack\data\meshes\` (gitignored;
  manifest `product_name`): `5dbbe4e15c29…` = `asm217755_214699_002` (lower
  head, 10 faces), `8899ea5d7297…` = `asm217755_214698_002` (upper head,
  161 faces), `ed1010fe02c9…` = `asm217755_214700_002` (piston body, 171 faces),
  `6d5b1321446d…` = `machined_213668` (the mount), `37e9f606341b…` =
  `asm217755_215177_001` (the plate). **No mesh of 214958-002, the piston
  cover.** Each mesh's `provenance.json` carries its `placement_world` in the
  217755 assembly at 72° blade pitch (the feather stop), so the order of the
  stop faces along the spindle axis (CAD Z) can be read off the placed meshes.
- `study_pitch_system_gas_spring_mechanical_stroke.json` is the one-edge
  precedent and holds the requirement citations: S461-516/637 (nominal
  operating stroke 61.67 mm, "equivalent to 75° blade pitch travel"),
  S461-610/636, S461-616/617/638/639. The requirements document is
  `C:\workspace\tolstack\data\inbox\requirements\S461_equipmentrequirements_20260906.json`.
- The placeholder policy: `docs/SOP_TOLERANCE_STACK.md`, amendment 2026-09-15.
  A placeholder needs a named source and a loud badge; `kind: "assumed"` with
  `PLACEHOLDER` in the note is the committed shape (`topology_pitch_system.json`
  has nine). `SOURCE_REF_KINDS` is `drawing | parts_list | workbook | spec |
  pipeline_element | assumed | requirement`; there is no mesh kind, so a
  mesh-fitted nominal is cited as `assumed` with the mesh sha, face ids and fit
  residual in the `note`, and the band is the placeholder. A fitted nominal is
  a measurement of a mesh, never a tolerance (`docs/ANNOTATION_SURFACE.md`).

## Deliverables

1. **Parts and interfaces.** Add parts `piston_head_lower_214699_002`
   (drawing `214699-002`), `piston_head_upper_214698_002` (`214698-002`),
   `piston_cover_214958_002` (`214958-002`, no mesh: note it the way
   `gas_spring_piston_214700_002`'s row notes its state). Add alias rows for
   the two heads in `part_mesh_aliases.json` so the annotator shows them.
   Add the nodes the chain needs: the lower head's lower face against the
   cover's end-stop face (a `mating_surface` of the two, **the main datum**);
   the upper head's upper face against the mount's end-stop face (the other
   stop); the cover's bottom flange against the mount flange; and whatever
   faces tie each head to the piston body. Establish the order of these faces
   along CAD Z from the placed meshes before you draw an edge, and write the
   order, with the Z values you read, into the worksheet.
2. **Edges.** `piston_head_lower_thickness`, `piston_head_upper_thickness`,
   `piston_cover_flange_to_end_stop` (Jeff: ~82.154), `gas_spring_mount_flange_to_end_stop`
   (Jeff: ~8.667), and, only if the placed meshes show the heads seat at the
   piston body's two ends rather than against each other, `piston_body_between_heads`
   (Jeff's ~108.669 belongs here or nowhere; decide from the meshes and say
   why). Plus the derived `gap` edge `travel_between_end_stops`, no dimension,
   named by the study's `closes`. Nominals: fit from the installed meshes with
   `tolerance_stack/feature_geometry.py`'s plane fits (two parallel planar
   faces, distance along their common normal; record face ids and residuals);
   for the cover, Jeff's number is the only source and is cited as such. Bands:
   from the drawings if they land, else `assumed` placeholders with `PLACEHOLDER`
   in the note and a width you state the reason for (the repo's existing
   placeholders use ±0.05 and ±0.1; copy the convention, not a guess of your
   own). The lower head's lower face carries a flatness callout only (Jeff): a
   form tolerance, no length; record it as a `note` on that node, not an edge.
3. **The study**, `study_vpa_pitch_linkage_travel_between_end_stops.json`:
   `from` the main datum node, `to` the upper stop node, `closes:
   travel_between_end_stops`, `selection` = the chain above, identity
   transforms, units mm. Checks: the nominal operating stroke S461-516/637 as
   `context_ref` (not a limit: it is a nominal, not a bound) and S461-617/639
   as the requirement this study exists to answer; and a check with `limit`
   only where a requirement states a number for the mechanical travel (read
   the S461 document for S461-610/636/616/638 and quote what they say; if none
   gives a bound, `no_checks_reason` says so and the two context refs ride in
   `provenance`). `complete: false` while any term is a placeholder, with every
   placeholder named in `excluded_terms`. Title and description per the SOP's
   "Titling an artifact".
4. **The worksheet**, `docs/tolerance_stacks/WORKSHEET_gas_spring_end_stop_travel.md`:
   Jeff's statement, the face order you established with Z values, the fits
   (mesh, faces, residual, value), the sign of every edge in the chain and why,
   the requirement rows read, and the traced ratio in a `claim` fence per
   `tests/claims_registry.py` (read its format before writing; a bare fence
   anywhere else reddens the suite).
5. **The inventory sentence** in `docs/DAG_TOPOLOGY.md` for this topology
   (13/24/29/9/6/11 today) updated to what the graph now derives; the suite
   pairs it.

## Definition of done

- The study loads and folds; `scripts/build_topology_projection.py
  --data-root C:/workspace/tolstack/data` emits it and the topology page's
  `[real]` tier still closes (`node apps/viewer/run_tests.cjs --repo
  C:/workspace/tolstack`; do not rebuild the shared projection from a worktree
  without `--allow-older-tree`, and say in the lesson if you did).
- `venv-win/Scripts/python.exe -m pytest -q` green except the documented
  worktree-only red; `node apps/annotate/run_tests.cjs` still 182/182 or
  better (its `[real]` tier checks every v1 run names parts this topology
  declares; adding parts cannot break it, renaming one would).
- Lesson (`docs/sessions/lessons/LESSONS_20261016_the_travel_between_the_end_stops_is_a_study.md`):
  the nominal travel and its worst-case and RSS intervals; which members are
  placeholders and the todo id that asks for their drawings; the face order
  with Z values; whether the piston body is a member and why; and the one
  number Jeff will compare it to, the ATP's derived travel of 65.03 mm against
  a ≤65 mm acceptance row (atp-post, S4ATS-2439), stated beside your nominal
  with no claim about which is right.
