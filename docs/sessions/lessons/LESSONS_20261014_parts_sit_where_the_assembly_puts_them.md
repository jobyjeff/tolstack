# LESSONS 2026-10-14 — parts_sit_where_the_assembly_puts_them

The annotator draws every opened part at every occurrence the 217755
assembly records, in sweep mode and out of it; `sweep latest` means the newest
run by its own `ts`; the pitch plate carries the parts recorded inside it; and
the gas-spring piston has a topology row.

## The four decisions the handoff asked to have recorded

### The repeat count: draw every one, cap at 64, and say so past it

`AA.OCCURRENCE_DRAW_LIMIT = 64` (`sweep.js`). The handoff suggested capping
"pathological" counts and named `NAS1149V0332H` at 29; I read 29 as the
**largest real count**, not as a pathological one, and drew it in full. The
argument is cost: a repeat shares the part's geometry *and* material, so an
occurrence costs one draw call and one matrix — 29 washers of 208 triangles
are nothing beside one blade. The cap exists for a part nobody has extracted
yet (a rivet pattern of hundreds), and past it the part is drawn at the first
64 and its panel row says "drawn at 64 of its N positions in the assembly". No
installed part reaches it; the fast tier pins that the cap is above 29, so a
lowered cap that would cut a real part short goes red.

### The pick → occurrence rule

**The nearest hit along the ray wins, on whichever occurrence it lands, and it
resolves to the part's own `(sha256, face id)`.** three.js's `Mesh.raycast`
transforms the ray into the object's local frame, so the hit triangle index is
the same index into the part's own buffers whatever matrix drew it; a repeat
carries the part's `faceIdPerTriangle` by reference. The pick also reports
`occurrence` (0 for the part itself, 1.. for its repeats), and that index
**never reaches an event**: `AA.geometryKeyOfPick` is now the one place a pick
becomes a geometry key, and it reads only sha, face id and the manifest
record. Pinned twice: a fast-tier guard that a pick on occurrence 1 builds a
byte-identical event to one on occurrence 0 (and that clicking the same face
on another occurrence *toggles it off* — it is one face), and two browser
assertions that aim at one triangle on a placed occurrence, then put the part
back at its own origin and aim at the same triangle there, and get the same
`(sha, face)` both ways — on the mock part's second occurrence and on the
tangential link's **third**.

**Should the detail pane name the occurrence? No, not now.** A binding is
part-local, so naming "you picked occurrence 3" in the bind bar would suggest
the binding is about occurrence 3, which it is not. The vertex-colour
highlight already says the right thing by accident: repeats share the colour
buffer, so the picked face lights up on *every* occurrence of the part, which
is exactly what the binding will mean. The index is there on the pick for the
cross-part suggestions, which will need it (below).

### Subtree versus listed parts: the subtree rule lives here, consumer side

`AA.sweepCarriedOccurrences`: an occurrence of any mesh whose instance path is
under a matched occurrence rides that body's pose. Deepest enclosing match
wins; a part the run lists by name always beats an inherited claim; and a
*different* mesh recorded at exactly a matched path (the instrumented
`546293-002` at the design link's `213862-002.1`) is the same occurrence and
moves too, but is not auto-opened, because drawing both is one link drawn on
top of itself.

**Consumer side, and not an ask of the artifact**, because the instance paths
are tolstack's data, not linkage's: they come from rotorkit's extraction into
`data/meshes/*/provenance.json`, which linkage never reads. Asking linkage to
emit "which occurrences body X carries" would have it restate a mesh-store
fact it has no way to check — the restated-copy shape of linkage's own
`ISSUE_20261001_body_parts_and_link_parts_are_a_hand_restated_copy_of_tolstacks_topology_ids`,
moved one layer down. What the artifact should keep saying is which *topology
parts* a body carries; everything inside their occurrences follows from paths.
For the plate this resolves: 8 × `NAS77A3-015A`, 1 × `NAS77A4-015A` and the
machined `215735-001`, all carried, none listed. Nothing for linkage's issue to
do here — it is in another repo, and the subtree rule removes this *case* from
it rather than the issue.

### The frame rate, measured — and 10-01's "4 fps" was a floor, not a reading

| scene (headless Chrome, SwiftShader) | meshes | triangles drawn | **measured** | `sweep.fps` read |
|---|---:|---:|---:|---:|
| 10-01's, run P1 of 10-01, HEAD of `integration` | 7 | about 1.15 M | **0.75 fps** | 4.0 |
| this handoff's, run P1 of 10-15, the pitch linkage placed | 16 | 2,029,770 | **0.37 fps** | 4.0 |

Measured by counting `requestAnimationFrame` callbacks over 8 s of wall clock
while playing. **`sweep.fps` cannot read below 4**: it is built from the frame
interval *after* `tickSweep` caps it at 0.25 s (the background-tab guard), and
both 10-01 lessons reported that cap as the frame rate. The check now prints
the counted figure; the cap itself is filed
(`ISSUE_20261014_sweep_modes_frame_rate_figure_cannot_read_below_four…`,
with `needs: jeff` for the one GPU reading nobody has taken). The two rows are
roughly proportional to triangles — about 0.8 M triangles a second of software
rasterisation — so the new scene is slower because it draws more, not because
anything per-frame got worse. The heavy items are the hub (364 k) and the
design blade, which the rule now draws at blade 2 as well as moving at blade 1
(608 k twice).

A second-order cost worth knowing: **resolving the bodies took 89.9 s** with
the linkage open and opaque, and **558 s** in the evidence run, where the
see-through preference was on from the out-of-sweep shot — against about 10 s
on 10-01. Nothing in the fitting got slower; anchoring is async and every
`await` yields to a frame, and a frame is 2.5 s opaque here and much longer
translucent. On a GPU this term vanishes; headless, it dominates — and it is
why `run_browser_check.mjs` now waits up to 600 s for the bodies and 240 s
for a screenshot (`SHOT_TIMEOUT_MS`), where 180 s and playwright's 30 s
default both timed out.

The evidence is in `assets/shots_20261014_parts_in_place/`:
`assembled_real_dark_out_of_sweep.png` (the linkage opened together,
see-through, assembled round the hub) and `sweep_real_dark_*deg.png` (run P1
of 10-15 at four pitch angles: the tangential links and their mount still, the
plate with its bushings and blade 1 moving), plus the mock run's four.

## What real geometry broke that a fixture never would

**`pick()` raycast a stale `matrixWorld`.** three.js refreshes `matrixWorld`
when it renders, and a placement set since the last frame moves `matrix` only.
The side-by-side layout set `mesh.position` once at load and never again, so
this never showed; with placements it did, first as a pick returning `null`
right after `setRestPlacements`, and — I think — as the bead-hover check
failing once on a scrub that landed between frames. `pick()` and
`sweepHover()` both call `scene.updateMatrixWorld()` first now.

**three.js's raycaster ignores `.visible`.** `scene.js`'s own comment said
three.js "skips an invisible object in both rendering and raycasting"; it skips
it in rendering only (r169's `Raycaster.intersect` tests layers, not
visibility). Harmless while parts sat in a row; not now — the first real pick
check hit the hidden tangential-link *mount* sitting in front of the link.
`pick()` filters on `.visible` and the comment is corrected.

**A sweep's anchoring outlived the sweep.** `anchorSweepBodies` is not awaited
(the stick figure is usable at once) and takes seconds; `sweep latest` then
`sweep off` then `sweep <another>` left the first run's anchoring opening parts
for a sweep that no longer existed, which nothing would ever close. Every await
re-checks `state.sweep` now, and a part it opened after being superseded is
closed again.

**The suggestion engine's two "cannot" sentences became false on screen.**
`AA.NO_MATING_PLANE_RELATION` said "the parts here sit side by side rather than
assembled"; `AA.NO_SAME_PART_SPHERE_RELATION` said "a part is drawn once here".
Both were surface copy, both were made false by this handoff, and neither was
in its listed scope. Rewritten to what is still true (suggestions compare one
part's faces at a time; a binding names a part's face at every position) with
the engine's logic untouched, which is the handoff's fence. A grep for the
retired claim's *wording* across the repo is what found them — the same grep
found three stale comments and a line in `ARCHITECTURE.md`.

## Decisions the handoff did not make

* **Every occurrence of an anchored mesh is drawn, not only the moving ones.**
  Before, a mesh a sweep anchored was drawn only where it moved, so the four
  pitch arms the run does not model vanished when sweep mode began. Now one
  plan per mesh (`AA.sweepDrawPlan`, built once per run) says, per occurrence,
  which body's pose carries it or `null`, and the frame loop only composes
  matrices (`AA.sweepMeshMatrices`). Blade 1's arm swings; the other four sit
  still. Physically all five pitch together through the plate; the run models
  one, and the still ones are honest about that.
* **Opened parts are no longer hidden on entering sweep mode**, which is what
  "every other opened part sits static" requires — and they take the
  See-through preference too. The first 72° shot had the gas-spring housing
  opaque over the plate, for exactly the reason anchored parts were made
  see-through on 10-01. Leaving restores each part's visibility *and*
  see-through state, which the old snapshot did not record.
* **The picker names a run by mechanism and publication time**, and when it is
  shown the summary line drops the mechanism words so the bar does not say it
  twice (prose budget: no echo). Two published P1 runs share a mechanism name,
  so the time is what tells them apart.
* **Mesh labels are shortened in the bodies disclosure** (`AA.meshShortName`
  drops "(extracted from <the STEP file>)", which every mesh from one assembly
  carries). The parts panel keeps the full label — that panel is the next
  handoff's (`a_context_filter_and_a_view_filter`), and was fenced.
* **Carried rows are listed only while their mesh is open.** The instrumented
  blade is carried by the blade body but nobody opened it; a row saying it
  moves would describe nothing on screen.

## Deliverable 5, the topology row

`gas_spring_piston_214700_002` sits after `gas_spring` in
`docs/topologies/topology_vpa_pitch_linkage.json`: drawing `214700-002`,
217755-001 find 88 (`docs/tolerance_stacks/WORKSHEET_endstop_vision_baseline.md`'s
find-number table, which also records the drawing `214700-002-A` as read),
Jeff's sentence quoted, and its STEP occurrence `P3-214700.3` named — its bolts
are installed, the piston body is not. No alias row, so the annotator's "no 3D
model" state is the answer, and the real check shows it:
`pitch_plate / gas_spring_piston_214700_002: no-mesh`. **The row was already
needed when I arrived**: linkage published three new runs during this session
(`…-20261015-013931`, P1, P2 and S) whose `pitch_plate` names the piston, and
the annotate `[real]` tier went red on "names part … which no tracked topology
declares" until the row landed. One other thing had to move, and the suite
said which: `docs/DAG_TOPOLOGY.md`'s inventory sentence for this topology
(12 parts → 13), which `tests/test_topology.py` re-derives from the graph.

## Found on arrival

Nothing: `git status` in this worktree was clean, and this handoff wrote no
tracked file outside it.

## Left behind, all filed

* `ISSUE_20261014_sweep_modes_frame_rate_figure_cannot_read_below_four_and_the_full_linkage_has_never_been_timed_on_a_gpu.md`
  — the 4 fps floor in `sweep.fps`, and the GPU reading (`needs: jeff`).
* The cross-part suggestions are still
  `ISSUE_20260921_cross_part_face_relations_need_assembly_placement.md`, which
  gained a dated update naming the pieces the next step can now use, and the
  open design question it has always had (which occurrence a relation is asked
  at, when a binding names a part).
* The new browser-check assertions are, like every other one in
  `run_browser_check.mjs`, reached by no gate and no mutation tier — row 4 of
  `ISSUE_20261001_four_sweep_mode_gaps_the_handoff_left_and_nobody_owns.md`,
  already filed and deferred to 2026-10-15. Not re-filed.

## The suites

All run from this worktree; the data-reading tiers pointed at the main
checkout's `data/` with `--repo C:/workspace/tolstack`.

* `node apps/annotate/run_tests.cjs` — **182/182**, `[real]` tier included
  (it falls back to the main checkout's `data/`).
* `node apps/annotate/run_browser_check.mjs --real vpa-pitch-p1-20261015-013931 --shots …`
  — **54/54** (37 mock + 17 `[real]`), the evidence run.
* `venv-win/Scripts/python.exe -m pytest -q` — first run **2 failed, 1444
  passed, 1 skipped** (274 s): `test_topology.py`'s inventory pairing (mine,
  fixed — 147/147 after) and `test_viewer_js_suite.py`, the documented
  worktree-only red (no `data/projections/viewer/` here).
* `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` — **428/429,
  node-fs `[real]` tier SKIPPED**: it refuses the shared projection because
  it was built from a tree this branch is not. Not rebuilt, deliberately — it
  is shared by every live worktree; the batch merge rebuilds it.
* `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
  (main checkout's `node_modules` junctioned in for the run, removed after) —
  first **23/25**: three annotate checks assumed the side-by-side layout
  (fixed, below); then **25/25**. One earlier run had the deselect *click*
  fail once and pass on rerun, before its aim was moved onto the world matrix;
  I could not reproduce it after, and say so rather than call it fixed.
* `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack`
  (same junction) — **101/160 witnessed**: every `annotate` (38), `browser`
  (53) and `python` (10) spec, including this handoff's five. All 59 misses
  are `fast` specs reported "the tier was red before the mutation" — the
  viewer tier's projection-freshness refusal above, not a decayed guard.

The three browser-tier checks that moved: the deselect suite's aim now goes
through the part's `matrixWorld` (it added `mesh.position` to the centroid,
right only for an unrotated placement), and the two "one body in the scene"
counts count distinct geometries, because a part's repeats share its geometry
and a duplicate body brings its own. The overlay-colour read follows the
mark's new shape (`mark.material`, one material across every occurrence's
overlay).
