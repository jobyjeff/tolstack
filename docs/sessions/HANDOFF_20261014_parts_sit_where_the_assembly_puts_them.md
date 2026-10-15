---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-10-14 — parts_sit_where_the_assembly_puts_them: the annotator draws every part at its 217755 occurrence, in sweep mode and out of it, and `sweep latest` means the newest run

Source: strategy session 2026-10-14. Jeff watched sweep mode in Chrome and
said the "parts with a 3D model" list "seems like there's no rhyme or reason
… just a bunch of random parts floating in weird positions in space". Asked
whether the side-by-side layout is intentional, Jeff said: "I don't think they
should be, even for the face picker. One of the things I was suggesting was
enabling filtering, where interfaces could be suggested based on coincident
faces from two bodies, so they should be positioned exactly as they are in the
assembly." The annotation roadmap already planned for this ("side-by-side
layout retires either way", 2026-09-08), and
`ISSUE_20260921_cross_part_face_relations_need_assembly_placement.md` is the
gap it closes.

Baseline: `integration`, sweep mode as of `kinematic_sweep_animation` +
`the_sweep_frame_loop_does_only_per_frame_work` (both completed 10-01).

Scope: `apps/annotate/` (mainly `scene.js`, `app.js`, `sweep.js`, the
storage adapters' run listing), `docs/ANNOTATION_SURFACE.md`,
`apps/annotate/README.md`, `docs/topologies/topology_vpa_pitch_linkage.json`
(one part row, item 5).

Do NOT touch:
- the parts panel's filter UX (isolate toggle, show-all, context-vs-view).
  That is `a_context_filter_and_a_view_filter`, staged after this one.
- `apps/viewer/` (its flyout's placement is a later handoff;
  `DRAFT_kinematic_model_viewer.md`).
- linkage or rotorkit.

## What is true today (measured 2026-10-14, main checkout)

- `scene.js` lays every opened part out along X in its own local frame
  (`_layoutX`, `PART_MARGIN = 50`). Sweep mode overrides that only for parts
  a run's `bodies[].parts`/`links[].parts` resolves (`setPartMatrix`).
  Everything else Jeff ticks lands in the row, far from the mechanism.
- 32 of the 34 installed meshes carry 217755 placements in
  `provenance.json` `extraction.instances[].placement_world` (3×4 row-major,
  the layout `sweep.js` already uses). `loadOccurrences()` in `app.js` reads
  all of them already. The two without placements are the standalone STEPs
  `213668-002` (`6d5b1321…`) and the M1 blade OML (`84c44119…`).
- Example: tangential link `212956-005` (`8f519ff4…`) has three occurrences
  (`…/prd-e-03438709.{1,2,3}`), and none of them is drawn where it sits.
- **`sweep latest` is alphabetical, not newest.** `FsaAdapter.listSweepRuns`
  sorts by run id descending, so `vpa-pitch-s-…` beats `vpa-pitch-p1-…` even
  though both have the same timestamp. Jeff watched run **S** believing it
  was P1, and saw the plate end of the pitch link swing (correct for S, whose
  plate point comes from the 3DX sheet) and the pitch plate unplaced (S has no
  `pitch_plate` body). Both surprises came from the wrong run being
  "latest", plus the floating layout.

## Deliverables

1. **One placement rule for the whole app.** An opened part with recorded
   occurrences is drawn at its `placement_world`, in the 217755 frame,
   whether or not sweep mode is on.
   - Draw **every** occurrence (the `_setRepeats` machinery sweep mode
     already has).
   - Suggestion: cap pathological repeat counts with an honest note rather
     than silently drawing one. `NAS1149V0332H` has 29.
   - A part with no recorded occurrence keeps a local-frame position, but
     says so in words on the surface (in its panel row, and in the banner when
     it is opened), e.g. "no position in the assembly — shown at its own
     origin". Use the README's existing absent-state wording style.
   - The side-by-side layout is deleted, not kept behind a flag.
   - Camera framing (`camera reset`/`frame`) works on assembly-frame bounds.
2. **Face picking works on a placed part.** Raycasting already hits world
   geometry, but a pick on an instanced occurrence must resolve back to
   `(mesh sha256, face id)` in the part's own frame. Bindings stay part-local
   (`feature-identity/v0` is unchanged), so a binding written today means the
   same thing it did yesterday.
   - Say in the lesson which occurrence a pick lands on, and whether the
     detail pane should name it.
   - The suggestion engine's per-part logic is unchanged. Don't build the
     coincident-face cross-part suggestions here; that's the named next step
     this unblocks (leave the issue open with a pointer).
3. **Sweep mode on top of the same rule.**
   - Parts a run's bodies/links own animate as today.
   - Every other opened part sits static at its as-modelled 72° occurrence.
     The bodies disclosure lists those parts under a plain heading, something
     like "not moved by this run".
   - Leaving sweep mode still restores the scene exactly. That is now simpler,
     since there is no layout position to restore.
   - A run whose body names a topology part with no installed mesh (P2 will
     name `gas_spring_piston_214700_002` before rotorkit installs it) keeps
     today's "no 3D model" state.
4. **`sweep latest` = newest by the artifact's `ts`**, tie-broken by run id.
   This has to hold on every adapter that lists runs (FSA, memory/mock, and
   the browser check's read harness).
   - The run id in the bar's first row is already shown. Also make the
     run's **mechanism name** readable there in words, so "which run am I
     watching" is answerable from the page.
   - Suggestion: a run picker `<select>` when more than one run exists,
     driving the `sweep <run-id>` verb.
5. **Topology part row** `gas_spring_piston_214700_002` (`214700-002`,
   PISTON BODY, GAS SPRING) in `docs/topologies/topology_vpa_pitch_linkage.json`.
   - Jeff: "it's rigidly bolted to the piston and it has the cylindrical
     surface that rides on the gas spring linear guides". It belongs to the
     `pitch_plate` body.
   - Its mesh is coming from rotorkit `extract_the_gas_spring_piston`. Until
     then it is an honest "no 3D model" part.
   - Follow the topology's existing alias/provenance conventions, and the
     pairing tests will tell you what else must move.
   - **Jeff's preference on the plate**: `215177-001` is "the assembly with
     the bushings pressed into it, which are what actually contact the
     spherical bearings". The installed `215177-001` mesh (`37e9f606…`) sits
     at `…/215177-001.2/215177-001.3`, and its bushings are separate meshes
     under the same occurrence: `NAS77A3-015A` `513c2be1…` ×8 and
     `NAS77A4-015A` `c4634e92…` ×1.
   - In sweep mode, anything whose instance path lies under the plate's
     occurrence should move with the plate. Suggestion: resolve a body's
     parts by **occurrence subtree** (instance-path prefix), not only by the
     hand-listed part ids. That also retires the root cause of linkage's
     `ISSUE_20261001_body_parts_and_link_parts_are_a_hand_restated_copy_of_tolstacks_topology_ids.md`
     for this case.
   - Decide, and record in the lesson, whether the subtree rule lives here
     (consumer side) or should be asked of the artifact.
6. **Fix the mislabelled evidence caption.**
   `docs/sessions/lessons/assets/sweep_screenshots_real.txt` says its shots
   were captured against the mock run, but they are of the real P1 run.

## Definition of done

- Browser-check evidence (`node apps/annotate/run_browser_check.mjs --real
  <run> --shots …`, dark) with screenshots at four pitch angles:
  - **Out of sweep mode:** the pitch-linkage parts opened together, sitting
    assembled around the hub.
  - **In sweep mode on P1:** `212956-005` (all three), `215175-001` and the
    bushings sitting in place, static, while the plate and blade move.
- `sweep latest` opens the run with the newest `ts`, pinned by a
  fast-tier test over a two-run fixture with equal and unequal timestamps.
- A pick on a placed part writes the same `(sha, face)` it would have before.
  Pin it with a fast-tier test, plus one browser-check assertion.
- Full suite green in the main checkout, including the viewer and browser
  tiers per `CLAUDE.md`, and a mutation spec for every new guard.
- Lesson must record:
  - the repeat-count decision;
  - the pick→occurrence rule;
  - the subtree-vs-listed-parts decision;
  - measured frame rate with all pitch-linkage parts placed, against 10-01's
    4 fps headless.
