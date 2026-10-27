---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-10-26 — the_rail_and_the_scene_point_at_each_other: hover a row and the body lights, pick a face and the row selects, hide a body and only that body goes

Source: strategy session 2026-10-26, Jeff walking the annotator in sweep mode
on the blade-pitch study: "it isn't easy to verify or update which surfaces
are bound to each interface (or which body is which). The only way to
distinguish bodies is to hide/show them … hiding that body hides all 5 not
just the one that is attached to the kinematic model … On the joints section,
also no way to see which surface is bound to the item. For everything in the
left structure menu, let's make hovering over an item highlight the
associated body or surface in the 3d view. Similarly, selecting a body or
surface in 3d should select the associated item(s) in the structure view.
Should we add a selection filter so you can choose types of features
(bodies/parts, surfaces, joints etc)?" (decided: yes, as view-filter chips).
Baseline: `master` after the 2026-10-22 batch merge. Scope: `apps/annotate/`
(`app.js`, `sweep.js`, `scene.js`, `commands.js`, `binding_state.js`,
styles, `run_tests.cjs`, `run_browser_check.mjs`), `docs/ANNOTATION_SURFACE.md`,
`tests/` for the annotator, mutation specs. Do NOT touch `apps/viewer/`
(`the_kinematic_page_keeps_the_dag_and_says_each_contributor_once` owns it),
`tolerance_stack/feature_identity.py` or the bind form's write path
(`a_binding_may_be_superseded`, staged, depends on this one).

## What is true today (measured 2026-10-26, file:line on `master`)

- **Rail → scene.** Only joint *feature* rows hover-highlight
  (`app.js:2099–2104`, `highlight <topology> <edge> <from|to>`); opening a
  joint runs `inspect joint`, which emphasises its bead (2201–2205); clicking
  a contributor runs `inspect contributor`, which tints faces already bound
  (2151–2154). **Body rows and part rows have no hover coupling at all.** A
  body row is a bare `<details>` (`treeNode`, 2023–2044) built by
  `renderSweepRail` (2164–2220) from `AA.sweepMechanismTree`
  (`sweep.js:1317–1363`).
- **Scene → rail: none.** `scene.onPick` reaches only `select-face` /
  `deselect` (3619–3640) and is gated off away from the as-modelled pose;
  hovering a joint bead shows a tooltip only (`showSweepTip`, 1363, wired at
  1068).
- **Visibility is keyed by mesh sha, not occurrence.** A part row's checkbox
  runs `show|hide <sha256>` (3233–3244) → `scene.setVisible(sha256, …)`,
  which sets the mesh and **every repeat** (`scene.js:417–424`; repeats copy
  it at 495). On run P2 the blade body's `pitch_arm` (215071-001) has five
  recorded occurrences, one per blade, so hiding the blade body's parts
  hides all five pitch arms while the mechanism's `blade` body is blade 1.
  There is no body-level checkbox.
- **Joint feature rows show a name only**, coloured by binding state
  (`featureRow`, 2082–2117; state from `AA.sweepFeatureEdge` → `AA.sweepFeatureState`
  → `AA.findBindingRecord`, `sweep.js:1405–1435`, `binding_state.js:127`).
  No mesh, part or face id is shown even when bound. The identity projection
  is `data/projections/feature-identity/bindings.json` (`storage/adapter.js:27–28`),
  which does not exist today because the inbox is empty — every row reads
  unbound, correctly.
- **The contributor alert popup is empty.** `app.js:2149` passes a bare
  string (`alertBadge([row.gap])`) while `alertBadge` and `showAlertPop`
  read `alert.text` (2549, 2575); the bind-mode rows pass `{state, text}`
  objects (`binding_state.js:103–106`). Jeff saw a popup repeating the
  visible text, which is the `title`; either way the badge offers nothing
  that resolves the alert. The two alerts are the study's gap rows
  (`tan_link_length`, `pitch_plate_tan_link_attach_radius`: no band cited;
  a sibling handoff reads their drawings).
- **No type filter exists.** The context filter / view filter from
  `HANDOFF_20261014_a_context_filter_and_a_view_filter` is at `app.js:282–361`
  (`contextBaseShas`, `cmdContext`, `cmdHideAll`; `AA.planContext`,
  `AA.planViewReset` in `commands.js:509, 569`; `docs/ANNOTATION_SURFACE.md:280–298`).
- **The embedded pane on the served origin asked for a folder.** Observed
  2026-10-26 in a fresh browser profile at
  `http://127.0.0.1:8000/tolstack/viewer/topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`
  → **3D**: the pane showed bind mode with "Connect folder … A linked
  element is queued — it opens once you connect", and never entered sweep
  mode. Sweep mode is read-only; the known class is
  `docs/issues/ISSUE_20260915_annotate_still_offers_connect_folder_on_a_hosted_origin.md`
  (and the open served-surface brief). Jeff's own browser has the grant, so
  he does not see this.

## Deliverables

1. **Every rail row highlights its thing on hover.** One highlight primitive
   (the existing face tint, extended to whole meshes), one tint — the accent
   is for selection per `docs/DESIGN_TYPE_AND_COLOUR.md`, so hover is the
   lighter emphasis. Body row → every mesh of its parts **at the occurrence
   the mechanism anchors** (item 3's resolution); part row → that mesh at
   that occurrence; joint row → its bead plus its bound faces (as today);
   feature row → as today; contributor row → the faces bound at its edge's
   two ends and, when none are bound, the parts at both ends. Hover leaves
   cleanly on mouseleave and never fights a picked face (the `highlight
   clear` rule the pane lesson records).
2. **Picking in the scene selects in the rail.** A click on a face in sweep
   mode (any frame — picking for *selection* is not the write boundary;
   binding stays gated to the as-modelled pose) selects the part row inside
   its body (expanding the body), and, when the face is bound, the feature
   row and its joint; a click on a joint bead selects the joint. Hovering a
   mesh emphasises its rail row lightly. One selection at a time, the
   existing rule. The embedded viewer's `highlight` messages keep working.
3. **Visibility per body and per occurrence.** Body rows get a checkbox.
   Hiding a body hides only the occurrence(s) the body is placed at (the
   placement match `AA.sweepBodyJoints` / the per-body resolution already
   used to pose it), never every repeat of a part's sha; a part row *inside
   a body* scopes to that body's occurrence; the parts panel (all
   occurrences of a sha) keeps today's behaviour and says so in its own
   row count. `scene.setVisible` gains an occurrence-scoped form. Expected
   on P2: hide `blade` → blade 1's blade mesh and its pitch arm go; four
   blades and four pitch arms stay.
4. **A joint's row shows the surface that defines it.** Each feature row
   names its bound face in words a reader can check — the part's drawing
   number and the face id (`face 110 of 214698-002`), with the sha on hover —
   or `no face bound` with the existing **Pick** control (2105–2114).
   Contributor rows get the same Pick / Re-pick as feature rows (a jump to
   bind mode on that edge at the as-modelled frame — the existing write
   boundary; no write happens from the sweep rail).
5. **A type filter.** Chips above the tree — bodies · joints · surfaces ·
   contributors — that hide row kinds, a *view* filter in the 10-14 sense
   (what is listed), never a context change; remembered the way the rail's
   width preference is. Everyday words; no vocabulary word invented in JS —
   the row kinds are the tree's own.
6. **The contributor alert says what resolves it.** Fix the bare-string
   pass; the alert text is the gap sentence plus the drawing(s) to read
   (from the edge's parts' `drawing` fields in the topology projection) and
   the Pick control. While you are in `alertBadge`, a browser check hovers a
   contributor badge and reads the popup text (none does today;
   `scripts/run_viewer_browser_tests.mjs:5953–6017` are element-list only).
7. **Sweep mode never asks for a folder.** On the served origin the embedded
   annotator enters sweep mode (and `highlight`, `inspect`, `goto`-less
   reads) with no grant; the queued-command gate waits only for a verb that
   writes. Measure at the URL above in a fresh profile (the TRUTH suite's
   `mock=1` trick in the 10-20 pane lesson is how to boot it headless).
8. **The rail's coefficient at the current frame** (suggestion, build if
   cheap): the artifact carries the full Jacobian per point, so the
   contributor rows under "contributors at the nearest stop" can show the
   coefficient at the **current frame** as the sweep plays, with the stop's
   value in the group header. Report feasibility in the lesson if not built.

## Definition of done

- On `http://127.0.0.1:8000/tolstack/annotate/index.html?sweep=vpa-pitch-p2-20261016-235852&kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`
  in a fresh profile: sweep mode opens with no folder prompt; hovering
  `base`, `pitch_plate`, `blade`, each joint, each feature and each
  contributor highlights what item 1 says; clicking blade 1's pitch arm in
  the scene selects its row under `blade`; unticking `blade` hides one
  blade and one pitch arm; the type chips hide and restore row kinds; the
  two gap contributors' badges open a popup naming 212956-005 / 215177-001
  (or 215735-001) and offer Pick. Screenshots (before/after for the hide)
  in `docs/sessions/shots_20261026_rail_and_scene/`.
- `node apps/annotate/run_tests.cjs`, `node apps/annotate/run_browser_check.mjs`
  and the annotate suites in `node scripts/run_viewer_browser_tests.mjs`
  green; bind mode's rail DOM still matches
  `tests/fixtures/annotate/bind_rail_snapshot.json` (or the snapshot is
  regenerated with a stated reason); every guard added has a mutation spec.
- Lesson (`docs/sessions/lessons/LESSONS_20261026_the_rail_and_the_scene_point_at_each_other.md`):
  how an occurrence is addressed for visibility (the key the scene uses),
  what picking at a non-modelled frame had to change, and the frame-rate
  cost of hover highlighting on the placed linkage (the 4 fps headless floor
  is in `ISSUE_20261014_sweep_modes_frame_rate_figure…`).
