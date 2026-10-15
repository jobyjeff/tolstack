---
type: review
handoff: docs/sessions/active/HANDOFF_20261014_parts_sit_where_the_assembly_puts_them.md
reviewer: agent (review/parts_sit_where_the_assembly_puts_them)
date: 2026-10-14
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-10-14 — parts_sit_where_the_assembly_puts_them

**APPROVE.** No blockers. Three should-fixes are left unfixed and each is filed
as an issue. There is one design finding (filed, non-blocking) and two inline
correction blockquotes in the lesson. Two of the should-fixes are not the
author's errors: rotorkit wrote 13 meshes into `data/meshes/` at 20:21, in the
middle of the session, and that made three of the handoff's statements false
after it had measured them.

## Which run this reviews

There is one handoff in `docs/sessions/active/`, and it is the one the branch
worked. This is the first review of this slug (`git log HEAD --
docs/sessions/reviews/` was empty). Every lesson and asset in the diff arrives
as `A`. The only `M` under `docs/sessions/` is
`assets/sweep_screenshots_real.txt`, which is deliverable 6's caption fix. It
keeps the earlier caption text and adds a correction blockquote. Containment:
`handoff/…` was not already in `integration`, and `integration` had not moved
since the branch was cut (`af87fd0`), so the merge was a fast-forward.

## What was verified, per deliverable

1. **One placement rule.** `scene.js` deletes the side-by-side layout
   (`PART_MARGIN`, `_layoutX`) outright. `placementsFor` is asked once per part
   before it joins the scene. `_drawAt` follows override → rest → own origin,
   and `_setRepeats` became app-wide. Marks are now children of each occurrence
   node, so they follow placement and visibility without being kept in step. The
   cap and the "no position" note are vocabulary constants
   (`AA.ASSEMBLY_POSITION_WORDS`). Framing uses assembly-frame boxes over every
   occurrence. The out-of-sweep screenshot shows the linkage assembled around the
   hub.
2. **Picks on a placed part.** three.js raycasts in the object's local frame, so
   the triangle index (and therefore `faceIdPerTriangle[i]`) does not depend on
   the matrix. Repeats carry the parent's `faceIdPerTriangle` by reference.
   `AA.geometryKeyOfPick` is the single place a pick becomes a key, and
   `occurrence` never reaches it. The author also found and fixed two real
   defects that the layout had masked: `matrixWorld` was stale at pick time, and
   the raycaster ignores `.visible`. Both are described correctly in the lesson.
3. **Sweep mode on the same rule.** `sweepDrawPlan` is built once per run, and
   `sweepMeshMatrices` only composes matrices per frame. The ghost and see-through
   state is cached per mesh, so the per-frame re-apply class from the overlay's
   entry does not come back. Superseded anchoring now checks `state.sweep` after
   every await, and a part opened after it was superseded is closed again.
   Leaving sweep mode restores visibility **and** ghost state.
   "Not moved by this run" is listed.
4. **`sweep latest` by `ts`.** `AA.orderSweepRuns` is the single ordering, used
   by the FSA adapter, the memory adapter and the browser-check harness (the
   fast tier checks all three, with equal, unequal and undated cases). On
   today's inbox, `latest` is P2 of 10-15 (`01:39:53Z`). The handoff's own
   example (P1 and S of 10-01) is pinned by the test's fixture.
5. **Topology row.** I checked every claim in the row's note: find 88 and
   `214700-002-A` are in `WORKSHEET_endstop_vision_baseline.md` (the find table
   at line 264, and the drawing at 1012); the occurrence `P3-214700.3` and its
   `NAS6403U13H` bolts are in the installed provenance. The DAG_TOPOLOGY
   inventory (12 → 13) is re-derived by `tests/test_topology.py`.
   **But see should-fix 3:** the piston mesh itself was installed at 20:21.
6. **Caption.** Fixed, with a dated blockquote explaining why.

Plate subtree: I re-derived it from `provenance.json`. Under
`…/215177-001.2/215177-001.3` the store holds 8 × `NAS77A3-015A`,
1 × `NAS77A4-015A` and 1 × `215735-001`, which matches the lesson. The
consumer-side decision (the subtree rule lives here, not as an ask of linkage)
is argued soundly in the lesson.

Lesson arithmetic, where the store can settle it: the hub at 364 k triangles
(363,681) ✓, the design blade at 608 k (608,637) ✓, the bushing counts ✓, and
"NAS1149V0332H at 29" ✓ *as of the measurement*. The fps and body-resolution
timings are single headless readings. They are reported as such and
`needs: jeff` is filed for the GPU reading.

Mandatory stack checks 1–7 do not apply: no stack element, path, check or
band changed. The single topology change is a part row with no value. Its
citation was opened and matches (above).

## Tests

**What the tactical report recorded.** A full `pytest -q` in the worktree:
`2 failed, 1444 passed, 1 skipped`, then fixed down to the documented worktree
red. The viewer fast tier ran `428/429` with the node-fs `[real]` tier
**SKIPPED** (freshness refusal). The browser tier ran `25/25`. The mutation tier
witnessed `101/160`, with all 59 misses being `fast` specs that hit
`TIER_ALREADY_RED`. So the viewer `[real]` tier and the fast half of the
mutation tier were **disarmed** in that record. The handoff's DoD says "full
suite green in the main checkout"; that was not literally done, and it could not
be, because the main checkout sits on trunk. I armed the disarmed tiers myself
(below) rather than repeating the run.

**Pre-merge risky subset** (rows: `apps/annotate/`, CSS, guard/witness, topology
data, prose, ARCHITECTURE, `scripts/*.mjs`):
- `node apps/annotate/run_tests.cjs`: **182/182**, 0 SKIP lines.
- `pytest -q` over `test_js_python_vocabulary`, `test_js_vocabulary_is_generated`,
  `test_feature_identity`, `test_part_mesh_aliases`, `test_app_type_scale`,
  `test_mutation_witnesses`, `test_tolerance_stack`, `test_topology`,
  `test_topology_projection`, `test_viewer_projection`, `test_provenance`,
  `test_thermal_exception_list`, `test_claims_registry`,
  `test_architecture_inventory`, `test_ops_toml_serve_verb` and
  `test_projection_freshness`: **639 passed**.

**Post-merge (the review worktree, which is the merged tree):**
- `pytest -q`: **1 failed, 1445 passed, 1 skipped** (276 s). The one failure is
  `test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the documented
  worktree-only red (no `data/projections/viewer/`).
- Viewer fast tier through `--repo C:/workspace/tolstack`: refused (`FAIL [real]
  the projection this tier reads was built from this tree`). That is correct,
  because this diff changes a projection input (`docs/topologies/`). **Armed
  through a scratch root** (`%TEMP%\tsrev2`: junctions for `data/inbox`,
  `data/meshes` and `venv-win` onto the main checkout and `docs` onto this
  worktree, a real `data/projections/`, all three builders with
  `--data-root`). Result: **522/522, no tier skipped.** I did not rebuild the
  shared projection: the main checkout sits on trunk, and a rebuild from this
  tree would disarm it until the batch merge.
- Browser tier (`node_modules` junctioned in, `--repo <scratch>`): **25/25**.
- Mutation tier (`--repo <scratch>`), targeted at what the tactical record
  left unproven:
  - all five of this handoff's specs: **5/5 WITNESSED** (the pick spec from a
    partial full run, the other four with `--only`);
  - every `fast__` spec: **59/59 WITNESSED**. These are the 59 that read
    `TIER_ALREADY_RED` in the tactical run.

  I did not repeat the 38 annotate and 53 browser specs: the tactical run
  witnessed them on a byte-identical tree (the merge was a fast-forward, so a
  merge cannot have decayed them). A full run was started and stopped after 10
  specs: at about 2 minutes per spec it would have taken hours. Its 7 completed
  results were all WITNESSED.
- My own geometric mutation (canonical "a new guard has been observed failing",
  and the overlay's "two pure helpers… composition in `app.js`" entry). I
  changed `placementsFor`'s return to `null`, which puts every part back at its
  origin and undoes the whole deliverable. Fast tier **182/182** and browser
  `--only annotate` **5/5** stayed green. Only the ungated
  `run_browser_check.mjs` went red. That is should-fix 2.
- Pollution: `git status` in the main checkout was clean before and after. The
  scratch root's projections are the only data written, and they are outside
  every checkout.

The browser tier's known edge-on flake ("a real click on the face tints it")
reddened once during my `--only annotate` runs and was green on the `--only
"rail filter"` replay. It is already filed and deferred
(`ISSUE_20260916_the_mock_annotator_mesh_is_edge_on_to_its_own_default_camera.md`),
so it was not re-filed. It is also the flake the lesson says it "could not
reproduce".

## Findings

### Should-fix (unfixed, each filed)

1. **The draw cap now cuts a real part short, and three texts say none
   reaches it.** `sweep.js` `AA.OCCURRENCE_DRAW_LIMIT` comment,
   `docs/ANNOTATION_SURFACE.md` "Where a part is drawn", and the lesson.
   `CCR244CS-3-02` (installed 20:21) has 66 occurrences. The fast-tier pin
   reads a literal 29, not the store, so it stayed green. Whether 66 should be
   capped at all is a design call: the cap's own cost argument says no. →
   `ISSUE_20261014_the_annotators_draw_cap_now_cuts_a_real_part_short_and_three_texts_say_no_part_reaches_it.md`.
   The lesson has a correction blockquote (inline). The two live texts do not:
   changing them means choosing the cap.
2. **The placement wiring can be deleted green in every gated tier.**
   `app.js` `state.scene.placementsFor`. Measured above. The fast-tier pick
   guard has the same weakness: it feeds `AA.geometryKeyOfPick` a hand-built
   pick and never raycasts a repeat. →
   `ISSUE_20261014_the_annotators_placement_wiring_can_be_deleted_green_in_every_gated_tier.md`.
3. **The piston mesh is installed and has no alias row.** I reviewed
   `topology_vpa_pitch_linkage.json`'s new row and `apps/annotate/README.md`'s
   sweep paragraph. `data/meshes/ed1010fe…/` (`product_name 214700-002`) was
   written at 20:21, and the row ("not yet installed") was committed at 19:55.
   The "no 3D model" state is still correct until an alias row exists. →
   `ISSUE_20261014_the_gas_spring_piston_mesh_is_installed_and_has_no_alias_row.md`.
   The lesson has a correction blockquote (inline).

### Design (filed `med`, non-blocking)

- The run picker names a run as "vpa pitch chunk0 p1 · 2026-10-15 01:39",
  which is linkage's mechanism id with the underscores swapped for spaces. →
  `ISSUE_20261014_design_the_sweep_run_picker_names_a_run_by_its_de_snaked_mechanism_id.md`.

### Nits

- `cmdSweep` now lists runs on **every** `sweep <id>`, not only `latest`, and
  `FsaAdapter.listSweepRuns` parses each run document in full to read its `ts`.
  That is about 3.2 MB today, and it grows with every published run. It is fine
  now; a `ts`-only read would be the fix if it ever shows.
- `loadAll` now reads all 47 `provenance.json` files serially at boot, before
  the parts panel renders. It was lazy before. This is the cost of the panel's
  notes, and acceptable.
- The two browser-tier "one body" counts now count distinct geometries. That is
  still right for the duplicate-load defect they guard. It is blind to a leaked
  *repeat*, which no check covers.

## Inline fixes made by the reviewer

- `LESSONS_20261014_parts_sit_where_the_assembly_puts_them.md`: two dated
  correction blockquotes (the cap, and the piston). Nothing else changed.

## Overlay

`docs/prompts/REVIEW_AGENT.md` has a new **Recurring bugs** entry: a design
constant or an install-state note justified by a count of `data/meshes/` while
rotorkit was writing to it. It also has one added sentence on the
`apps/annotate/` risky-subset row: for a scene/placement change, run
`run_browser_check.mjs`'s mock pass, because it is the only tier that sees
`app.js`'s scene wiring.
