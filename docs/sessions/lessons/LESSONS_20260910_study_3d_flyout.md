---
handoff: study_3d_flyout
date: 2026-09-10
---

# Lessons — study_3d_flyout

## The embed/command mechanism as shipped (read this first, hover-cards handoff)

One iframe, one vocabulary, two carriers:

- **First launch**: `topology_app.js`'s `launchAnnotate(params)` creates the
  flyout iframe lazily and boots it with URL params —
  `VA.annotateLink(params)`, the SAME builder every annotate link has used
  since `annotate_deep_link_and_part_filter`, now with a `trace=1` param. The
  iframe is **kept across launches** (grant, meshes, camera survive).
- **Later launches**: `VA.annotateExecCommands(params)` — a pure mirror of
  `annotateLink`, param for param — posts
  `{type: "annotate:exec", command}` to the iframe; the annotator's listener
  (app.js) runs each through `AA.exec`, queued behind `loadAll()` (the deep
  link's own "queued until you connect" semantics), in arrival order via a
  promise chain, and replies `{type: "annotate:result", id, ok, ...}`.
  Same-origin checked on BOTH ends. One in-between state: iframe exists but
  its `load` hasn't fired — a postMessage then would be silently lost
  (listeners aren't registered yet), so `launchAnnotate` re-points `src`
  instead; the `flyoutLoaded` flag is that seam.
- **The panel**: `#annotate-flyout`, a **non-modal** `position: fixed`
  `<dialog>` (`.show()`, not `.showModal()`) pinned to the right viewport
  edge. Fixed positioning is what makes "cannot shrink the DAG pane"
  structural; non-modal is what keeps the page clickable beside it, so
  "attach to 3D" on another row re-drives the open panel. **It deliberately
  covers the viewer's own detail pane while open** — the annotator's element
  detail supersedes it for the edge being worked; the browser tier's click
  flow (close → pick edge → attach reopens) mirrors the real gesture.
- **Degradation is the default**: `VA.probeAnnotateMount(fetchImpl, protocol)`
  HEADs `../annotate/index.html` at boot and requires ok + `text/html`
  (the catch-all-server trap from `storage/http.js`'s probe); `file://`
  degrades without fetching. The affordances are links unless BOTH
  `state.annotateMount` and a launcher handler are present — a probe that
  resolves after first paint upgrades in place via one `render()`.

For hover cards reusing annotator renders: there is no thumbnail/snapshot
verb yet. The pieces that exist: the iframe stays booted (a snapshot source),
`AA.exec` results are JSON-cloneable, and `scene.renderer.domElement` is a
canvas `toDataURL` could read — but nothing exposes that as a verb, and the
command layer is where it should land if built (not a side channel).

## New verbs (README table updated; the pairing test guards it)

- `ghost <part…>` — `isolate`'s translucent twin: same resolution, same
  `planIsolate` transition, `setGhost(true)` (opacity 0.22, `depthWrite`
  off). `open-part`/`show`/`isolate` now explicitly un-ghost their targets —
  "show me the part" must never inherit translucency from an earlier trace.
- `mark-face <part> <face_id>` — an opaque overlay on one face, additive,
  never touches the pick state (a mark is "a binding attaches here", a
  highlight is "you just picked this"; distinct colors, they coexist).
- `trace <topology> <study>` — composes the above the way `goto` composes the
  select verbs: select both, `AA.planStudyTrace(...)` (pure, commands.js),
  ghost the plan's meshes, mark its bound faces, banner summary. Publishes
  `window.__lastTrace` (the autotest convention) — the browser tier asserts
  the whole mock run off it.

`AA.planStudyTrace` is the load-bearing pure half: parts from the study
selection's edge `part`s (order-preserving, deduped, alias-resolved), marks
from `findBindingRecord` per edge, and three honest gap lists
(`missingParts`, `unresolvedMarks` — bindings to uninstalled meshes —
`unboundEdges`). A binding on a mesh the part list missed pulls that mesh
into the ghosts: the binding is evidence the feature lives there.

## The mark overlay copies geometry — do not "optimize" it into sharing

`AA.faceSubGeometry` (pure, tested) copies the face's contiguous vertex run
and remaps indices into it; `scene.markFace` builds an independent
`BufferGeometry` from the copy. The tempting alternative — share the parent's
`position`/`index` attributes and `setDrawRange` — is a use-after-free trap:
three.js deallocates a disposed geometry's attribute buffers with no
reference counting, so disposing a shared-attribute overlay would kill the
parent mesh on the GPU. The copy also lets the overlay throw on a mesh that
violates the contiguous-run tessellation contract instead of drawing
something wrong. `polygonOffset -1` keeps the parent's coplanar ghost surface
from z-fighting the mark.

## Headless WebGL WORKS on this machine — the standing "cannot machine-verify 3D" claim just shrank

Every prior lesson on this surface repeats "no WebGL in Node / no browser
automation here". Still true of Node — but this session the existing
playwright tier (`chromium.launch({channel: "chrome", headless: true})`)
**rendered the annotate app's three.js scene and ran a full `trace`
end-to-end** over `?mock=1` (ghost + mark-face handlers, `__lastTrace`
asserted, zero page errors). What remains genuinely un-machine-verifiable is
smaller than the folklore said: visual QUALITY (does 0.22 ghosting read well,
do green marks stand out on real geometry), OrbitControls feel, and anything
behind an FSA grant (no picker from Playwright). Next agent: don't design
around "the annotate app can't be driven in a test" — it can, same tier.

## Verified / not verified, and Jeff's click path

Machine-verified: `node apps/annotate/run_tests.cjs` 53/53 (planStudyTrace,
faceSubGeometry, verb-table pairing, plus a `[real]` check running
planStudyTrace over EVERY real study against real meshes + aliases);
`node apps/viewer/run_tests.cjs` 209/209 and 255/255 with
`--repo C:/workspace/tolstack`; `node scripts/run_viewer_browser_tests.mjs`
14/14 both modes (the new flyout suite: probe upgrade, zero-layout-shift
measured on the DAG pane's box, embedded annotator boots same-origin, mock
trace end-to-end, file:// degradation); pytest 759 passed / 1 skipped (the
standing worktree skip).

Real-data shape at lock (from the `[real]` tier + a one-off plan run):
`pitch_system_gas_spring_branch` traces to **1 ghost**
(`gas_spring_mount_213668_002` → mesh `6d5b1321…` through the alias table),
4 missing parts (`pitch_plate_215177_001`, `gas_spring`,
`tan_link_mount_215175_002`, `hub` — no meshes installed), **0 marks and 7
unbound edges** — `data/projections/feature-identity/bindings.json` does not
exist yet (no events ever written), so the honest all-unbound state is the
real state, exercised as such.

**Jeff, the one manual pass** (needs drawing-checker's server up, with its
merged `/tolstack/annotate/` mount): open `/tolstack/viewer/topology.html`
→ pick `pitch_system` → study `gas spring branch` → **View in 3D →** → in
the panel, Connect folder (repo root, read/write) → expect the gas-spring
mount ghosted alone, banner naming the 4 missing parts and 7 unbound edges
→ back in the viewer, pick an untraced edge → **attach to 3D →** → the same
panel isolates the part solid, click a face, bind. Then double-click
`topology.html` from disk once and confirm both affordances are plain links
again. What only your eyes can judge: ghost opacity, mark color legibility,
and that the panel width (55vw, capped 760px) leaves the DAG usable beside
it.

## Decisions not spelled out in the handoff

- **The viewer never reads bindings.json.** Feature 1 needs surface↔edge
  attachments, but the resolution lives in the annotator's `trace` verb —
  the app that already loads the identity projection — so the viewer sends
  two ids and the vocabulary stays whole (and the
  `annotate_deep_link_and_part_filter` scope decision "don't add that read
  to the viewer" survives).
- **The toolbar's "Annotate →" link is SUBSUMED by "View in 3D →"** where the
  mount is up (one affordance, not two: the flyout IS the annotator opened on
  that study, plus the trace), and remains exactly itself where it isn't.
  The detail-pane link upgrades the same way.
- **Scope held to topology studies.** "study/stack" in the feature line —
  classic stacks have nothing annotate-side to land on; filed as
  `ISSUE_20260910_classic_stacks_have_no_3d_launch.md` (strategy).
- **The connect-click-per-session cost** of the flyout (annotate has no HTTP
  read transport) is filed as
  `ISSUE_20260910_annotate_has_no_http_read_transport.md`.
- `ops.toml`'s serve verb comment now names the d-c mount canonical and 8843
  the dev fallback, per the 2026-09-10 consolidation decision; verb set
  untouched.
