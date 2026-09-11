---
priority: high
depends_on: [viewer_edge_length_scaling, mesh_part_alias_table, tolstack_annotate_mount]
model: opus
---

# HANDOFF 2026-09-10 — study_3d_flyout: the annotator becomes a flyout panel of the stack viewer; per-study 3D view traces the chain

Source: locked strategy brief 2026-09-10 (Jeff "very seriously thinking",
atomic note `20260910T114735_gf00sl` item 3). Baseline: post-batch-merge
master + merged `viewer_edge_length_scaling` (viewer layout settled),
`mesh_part_alias_table` (part→mesh resolution), and drawing-checker's
`tolstack_annotate_mount` (cross-repo, resolves on the board: the d-c server
now mounts `apps/annotate/` at `/tolstack/annotate/` beside
`/tolstack/viewer/` and `/tolstack/data/` — the same-origin precondition this
whole feature stands on). Scope: `apps/viewer/` + `apps/annotate/` + their
test tiers + `ops.toml`'s serve-verb comment. Do NOT touch: the staleness
banner / rebuild plumbing (`views/banner.js` rebuild affordance, landed); the
projection builders; `docs/topologies/`; drawing-checker's repo (its mount is
already merged by your baseline).

## The feature

1. **Per-study 3D launch**: from a study/stack in the topology viewer, launch
   a 3D view containing **only the parts in that stack** — parts rendered
   transparent, the surfaces attached to each interface/tolerance rendered
   opaque — so a reviewer can trace the chain visually. Surface↔tolerance
   attachments come from the feature-identity bindings
   (`C:\workspace\tolstack\data\projections\feature-identity\bindings.json`,
   main checkout; schema `feature-identity/v0` — see
   `docs/ANNOTATION_SURFACE.md`). A part with no installed mesh (after alias
   resolution) or an edge with no binding degrades to the existing honest
   empty/absent states — never a guessed surface.
2. **Annotator-as-flyout**: the 3D annotator (`apps/annotate/`) becomes a
   **flyout panel of the stack viewer**, auto-flying out whenever a 3D
   capability is needed — e.g. an "attach to 3D" button on an untraced
   tolerance row flies out with just that part visible, ready to click the
   surface (the annotator's existing select-and-tag flow; a binding is
   identity, not a value source — a drawing citation still wins where one
   exists).
3. **Honest degradation off-origin**: the flyout requires same-origin serving
   (the d-c mounts). Under `file://` or a plain static server, degrade to the
   existing "Annotate →" link behavior (new tab), not a broken panel — probe,
   don't assume, the way the transport layer already probes its data mounts.

## Suggested direction (investigate before committing; report in the lesson)

- **Embed via iframe + the existing command layer.** `apps/annotate/` already
  routes ALL interaction through one dispatch point (`AA.exec`, verbs:
  `open-part`/`show`/`hide`, `isolate <part…>` (variadic), `camera
  reset|frame <part…>`, `select-face <part> <face_id>`,
  `select-topology`/`select-study`/`select-edge`, `goto <topology> <edge>
  [study]`), and the viewer already builds relative annotator links
  (`VA.annotateLink`, `../annotate/index.html?...` — which resolves correctly
  under the d-c mounts since the two apps are siblings under `/tolstack/`).
  A flyout iframe driven by URL params for boot state plus `postMessage` →
  `AA.exec` for subsequent commands keeps one command vocabulary and zero
  parallel paths. New verbs you will likely need: something like
  `ghost <part…>`/opacity control (transparent-parts + opaque-surfaces has no
  verb today) and possibly a `select-face`-adjacent "highlight these faces"
  — add them AS verbs in `commands.js` (DOM-free half, tested with plain
  arrays) rather than as side channels, and extend the annotate command
  vocabulary pairing test that guards the verb table.
- **Camera/up-axis**: CATIA exports are Z-up and `OrbitControls` captures
  `camera.up` at construction, not live (`LESSONS_20260908_annotate_deep_link_
  and_part_filter.md`) — reconstruct controls if you ever need to change it.

## Constraints

- Hand-rolled, classic scripts, no framework/npm runtime deps, both apps.
- Viewer layout contracts stand: full-page scroll, the leader-line grid, the
  scaling toggle. The flyout must not shrink or fight the DAG pane — the
  `<dialog>`/top-layer precedent from `viewer_v2_single_nav` (§5 of its
  lesson) is the proven shape for "chrome that structurally cannot steal
  layout"; a flyout is a design cousin of that, not of a flex sibling.
- **`ops.toml`**: the `serve` verb (annotator on 8843) survives as a **dev
  fallback** — update its comment block to say the canonical serving surface
  is now the drawing-checker mount (`/tolstack/annotate/`), per the 2026-09-10
  consolidation decision. Do not add verbs; the verb set is closed.
- No WebGL in Node: the 3D visual result cannot be fully machine-verified.
  Test what the tiers can reach (command plans, verb registration, boot
  params, iframe wiring, degradation logic; browser tier for the flyout's
  layout behavior) and end the lesson with the standing recommendation that
  Jeff open it once and click through — the same recommendation every prior
  session touching this 3D surface has made.

## Definition of done

- Against real data (main checkout paths): selecting a pitch_system study and
  launching 3D yields the study's parts (those with meshes after alias
  resolution) with bound surfaces opaque; "attach to 3D" on an untraced edge
  flies out with that part isolated. Where meshes/bindings are absent, the
  honest empty states render — demonstrated in the browser tier where
  reachable, described precisely in the lesson where not.
- Full suite green: `node apps/viewer/run_tests.cjs` (both modes),
  `node apps/annotate/run_tests.cjs`,
  `node scripts/run_viewer_browser_tests.mjs` (both modes),
  `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`.
- Lesson (`docs/sessions/lessons/LESSONS_20260910_study_3d_flyout.md`): the
  embed/command mechanism as shipped (the next handoff,
  `viewer_hover_cards_and_deep_links`, builds hover cards that may reuse the
  annotator-render thumbnails), new verbs added, what could not be
  machine-verified and the exact click path Jeff should take.
