# Lessons — every_study_opens_in_3d_showing_only_its_parts (2026-11-03)

## Measure first — what the 3D pane did before this change

Read from the code, **not** run: I changed the code before taking a before-run, so
the "before" column is a reading of `topology_app.js` / `views/nav.js` / the
annotator's `goto`, and only the "after" column is a measurement. Say so when
quoting it.

| study kind | could the pane open? | mode | what the scene drew |
|---|---|---|---|
| kinematic study | only from the seam tab, or the *Kinematic model* row; the study row had no 3D control | sweep | the sweep's bodies; nothing ghosted |
| chain study with bound faces | seam tab only (`?pane=1` also); no row control | bind | `goto` ran `isolate`/`ghost` on the study's parts and **hid** every other installed part |
| chain study, none bound | same | bind | same — the study's parts, the rest hidden |
| topology row | same | bind | the topology's parts (ghosted by the see-through default), the rest hidden |

Where the 10-20 lesson and Jeff's note disagree: the pane **could** open for every
study (the seam tab), but no **row** offered it, and what it drew was the study's
parts with the rest *hidden*, never the assembly with the rest ghosted. The
`isolate`/`trace` words are not what decides it — a chain study's selection
derives `goto <topology> [edge] <study>`, and the annotator derives the parts
itself (`planScopeFilter`); the viewer never named a part set.

## After (real projection, `tests/debug_every_study_3d.mjs`, `--repo C:/workspace/tolstack`)

47 installed meshes. Solid / ghost / hidden counts after the row's 3D control:

| row | solid | ghost | hidden | head line |
|---|---:|---:|---:|---|
| `pitch_link_cotter_hole_clearance` | 5 (bushing, pitch plate, MS14101-3 bearing, washer, bolt) | 42 | 0 | Binding — Cotter hole clearance |
| kinematic study (blade pitch) | 9 | 38 | 0 | Sweep — vpa pitch chunk2 p2 |
| `rotor_fastener_grip_u2h` (none bound) | 2 | 45 | 0 | Binding — Grip budget, NAS6403U2H |
| topology row | 22 (every part its edges name) | 25 | 0 | Binding — Propeller pitch system, blade 1 |
| switch kinematic → cotter-hole, pane open | 9 → 5 | 38 → 42 | 0 | follows |
| `model unlit hide` on the cotter-hole study | 5 | 0 | 42 | — |
| `isolate parts no_such_part_anywhere` | — | — | — | `… — no 3D model for these parts yet` |

Screenshots (`docs/sessions/lessons/LESSONS_20261103_every_study_opens_in_3d_showing_only_its_parts_*.png`):
1 cotter-hole study, 2 kinematic, 3 grip study, 4 topology row, 5/6 the two
switches with the pane open, 7 no-3D-model head line. They are headless
SwiftShader frames: the scene column is small and slow, so judge the counts, not
the pictures.

## The one command's grammar

`isolate parts <part…>` — viewer → pane over `annotate:exec`, after the page's
`goto`/`sweep`. The named parts are solid; every other installed mesh is loaded,
shown and ghosted (hidden when the page's `model unlit` word is `hide`, which the
pane reads from the same state `syncSceneModel` already posts); the solid set is
framed. `isolate off` is the existing snapshot restore. A scope none of whose
parts resolves to a mesh changes nothing and the head line says "no 3D model for
these parts yet" (`AA.embedState`'s new fourth argument). An armed pick still
wins: `applyPartScope` returns while armed and the disarm restore brings the scope
back. `scene-view` is a new read-only verb returning `[{part, sha256, visible,
ghost}]` — added so the browser tier can assert the scene instead of the parts
panel's DOM.

The part set is `VA.litPartIds(topology, lit)` (`topology.js`): the part of every
lit edge, plus, for a joint (no part), the parts at its two ends. **A page with no
lit set — the topology row — lights every edge**, so the topology's parts are
solid. I first sent `isolate off` there and the live probe caught it: `isolate
off` restores the snapshot taken *after* `goto`'s context reset, which is the
ghosted see-through view with the rest hidden.

## Decisions the handoff did not make

- **No body expansion.** The handoff says "its edges' ends' parts, the bodies they
  belong to". Expanding to bodies would turn the whole `base` body (hub, both
  mounts, the fastener family) solid for any study touching one base part, which
  defeats the filter. I used edge parts and joint-end parts only. If Jeff meant the
  bodies, it is one line in `litPartIds`.
- **The kinematic study is filtered in sweep mode too**, by `kinematicLitSet`'s
  edges — 9 solid, 38 ghost — and the sweep keeps playing. Loading the 38 ghosts
  at their assembly placements worked without touching the sweep code.
- **Stack rows have no 3D control** (a stack page asks the pane for nothing,
  `annotateParamsFor` returns null) and the *Kinematic model* row keeps its own
  launch. Both are existing behaviour I left.
- The control is a quiet `3D` text button, visible on hover/focus and on the active
  row, rendered only where the annotate mount probed (absent elsewhere).
- `partScopePosted` is deliberately **not** reset by the pane's own `annotate:state`
  replies (unlike `sceneModelPosted`): the scope command makes the pane post a
  state, and resetting on it re-posts the scope forever. It resets only in
  `drivePane`.

## ISSUE_20261030_the_preview_offers_no_way_to_see_a_part_on_its_own_in_3d

**Not resolved.** The filter takes any part set, so a one-part scope is
`isolate parts <id>` — but the issue is about *where the action lives* (a node
Preview button, the component cell, or nowhere) and that placement is unchanged.
Left `deferred`; an addendum notes the command now exists.

## Verification notes

- `node apps/viewer/run_tests.cjs`: 514/515 + the node-fs tier SKIPPED (no
  projection in a worktree, as CLAUDE.md says). `node apps/annotate/run_tests.cjs`:
  270/270.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`: this
  runner imports `playwright-core` by name, which a worktree cannot resolve. I made
  a **local, untracked `node_modules` junction** to the main checkout's to run it
  from here and removed it before committing.
- `tests/test_mutation_witness_shadow_concurrency.py` (2 tests) fail in this
  worktree with an `EPERM` reaping a stale `tmp/mutation-witness-*` shadow; not
  related to this change (see the report).

## Found on arrival

Clean worktree; nothing.

## Verification record (what ran, where, what did not)

Worktree throughout; the machine's browser slot was contended by other agents.

- `venv-win/Scripts/python.exe -m pytest -q` (main-checkout interpreter, no
  xdist in that venv, so serial): **4 failed, 1684 passed, 1 skipped, 5m43s**
  — run *before* the pins were updated. Of the four: `test_viewer_js_suite`
  (expected in a worktree, node-fs tier skipped); `test_the_enrollment_census_holds`
  (this change's guards; fixed afterwards, re-run alone: `tests/test_mutation_witnesses.py`
  44 passed); two `test_mutation_witness_shadow_concurrency` tests failing on an
  EPERM reaping a stale `tmp/mutation-witness-*` shadow in this worktree
  (environmental; not re-checked against integration). No full pytest re-run after
  the pin update — only the census file.
- `node apps/viewer/run_tests.cjs` 514/515 + node-fs tier SKIPPED (no projection
  in a worktree); `node apps/annotate/run_tests.cjs` 270/270.
- Browser tier: **only** `node scripts/run_viewer_browser_tests.mjs --repo
  C:/workspace/tolstack --only "every study opens in 3D"` — 8/8, repeatedly. The
  full 41-suite tier was **not run** (too long under slot contention); the reviewer
  should run it in the main checkout.
- Mutation witnesses, run per entry under `--repo C:/workspace/tolstack`:
  WITNESSED — kinematic, topology row, hide word, no-mesh head line, none-bound
  (after re-pointing its mutation), chain-with-bound-faces, annotate `isolate parts`.
  Not shown: "its scene is solid on exactly the study's parts" (second rerun was
  cut off by the 590s cap; its first run printed a green baseline and no verdict),
  and the two **fast** entries, whose clean run is RED in a worktree (the node-fs
  tier skip) — they need the main checkout. `--changed-since integration` over the
  whole set was started but its output was lost to a tail; not a pass.
- The first browser check flaked twice on a loaded box (scene read before the
  ghosts finished loading / right after a switch); `scene(ready)` now waits for every
  installed mesh to be open and for the expected solid set.
