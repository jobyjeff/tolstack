# tolstack — annotate (`apps/annotate/`)

**Select geometry, tag it with a stack element's identity — no measurement.**
Built by handoff `annotation_surface_mvp` (2026-09-06) to close the gap the
endstop baseline measured: of 43 ground-truth rows, measurement blocked 0 and
**identity blocked 15** — a dimension's value extracts losslessly from a
drawing, but nothing states which physical feature a stack element or
topology edge means. This app is the human-in-the-loop surface that resolves
that: open a study, open a part, click a face, write one
`feature-identity/v0` event (`tolerance_stack/feature_identity.py`).

> **This app is NOT the viewer.** `apps/viewer/` is read-only and renders
> projections; this app **writes** — the one write path in this repo's
> `apps/` tree — and needs a File System Access grant with `mode: "readwrite"`,
> not `"read"`.

## What it does and does not do

- Loads a topology's studies (`data/projections/viewer/topologies.json` —
  the same projection the viewer renders, so this app never re-implements
  `dimension_ref` resolution in JS) and lists a study's elements with their
  current binding state: **bound** / **unbound** / **owner not in set** /
  **needs re-confirmation**.
- Opens a part's tessellated mesh (`data/meshes/<sha256>/`, lazily — a part's
  geometry loads only when you open it, not the whole set eagerly) and lets
  you click-select a face (raycast + contiguous-vertex-run highlight, reused
  from rotorkit's step_tessellation spike almost unchanged — see `scene.js`).
- Writes a `feature-identity/v0` event into `data/inbox/feature-identity/`
  for a binding, or for "the owner isn't in the part set I have open."
- **Does NOT measure, sum, or propose a binding.** A binding is identity, not
  a value source (the brief's decision 6): where an element already carries a
  drawing citation, the detail pane says so in plain words and the drawing
  still wins — this app never supplies a dimension.
- **Does NOT render an assembly with placement transforms.** Every fixture
  the underlying tessellation spike had was a single-part OML or a
  non-hierarchical bonded sub-assembly; nothing has exercised a real
  multi-part assembly's placement math. Parts render side by side, at their
  own local origin — see the session lesson for this gap.

## Run it

Static, build-free (three.js r169 via a native import map, no bundler — the
workspace's `apps/` convention), but **not launchable by double-click**: a
`file://` page can neither `fetch()` a local binary (CORS; the
step_tessellation spike hit this first) nor write one, so both this app's
reads (mesh binaries) and its one write path need a real transport.

```powershell
cd apps\annotate
C:\workspace\tolstack\venv-win\Scripts\python.exe -m http.server 8843
# open http://127.0.0.1:8843/index.html
```

Click **Connect folder**, pick the tolstack repo root
(`C:\workspace\tolstack`), grant **read/write**. Build the two projections
this app reads first, from the main checkout:

```powershell
venv-win\Scripts\python.exe scripts\build_topology_projection.py
venv-win\Scripts\python.exe scripts\build_feature_identity_projection.py
```

No folder handy? `index.html?mock=1` runs a small synthetic demo (one
topology, two edges, one already bound, one `owner_not_in_set`, a single
synthetic triangle mesh) — writes are captured in memory, never persisted,
and the "Connect folder" button is hidden (mock mode has no transport to
connect).

## Why `data/inbox/feature-identity/` is gitignored, unlike the spec library

`docs/spec_library/events/` (this repo's other append-only event stream) is
**committed** — hand-authored one event at a time, by an agent following a
procedure. Feature-identity events are generated continuously by an
interactive app instead, so they get the ordinary inbox stream's disposition
(filesystem-canonical, main-checkout-only, gitignored) rather than the spec
library's. See `data/inbox/feature-identity/README.md` for the full argument,
including the note that promoting this stream to committed later would be a
small, schema-compatible change if losing an uncommitted session's bindings
turns out to be costly in practice.

## Layout

```
apps/annotate/
  index.html          the page shell
  style.css           this app's own stylesheet (not shared with apps/viewer)
  config.js           paths, rebuild commands
  binding_state.js     PURE logic: stack-side keys, binding-state derivation,
                       event construction -- no DOM, no fetch. The one file a
                       test loads without a browser (run_tests.cjs).
  scene.js             the 3D surface: three.js mesh loading (through the
                       storage adapter, never fetch() directly), raycast,
                       highlight. ES module (ADR below).
  app.js               boot + wiring. ES module.
  fixtures.js          the ?mock=1 demo dataset
  storage/adapter.js   the read/write adapter contract
  storage/fsa.js       File System Access, mode: "readwrite"
  storage/memory.js    in-memory mock (?mock=1, tests) -- captures writes
                       rather than persisting them
  vendor/              three.js r169 + OrbitControls, copied verbatim from
                       rotorkit's spike (see vendor/README.md)
  run_tests.cjs        fast-tier runner for binding_state.js + storage/memory.js
```

### Why ES modules here, when apps/viewer is classic scripts

`apps/viewer` is classic scripts because it must run by double-clicking
`file://`, where Chrome CORS-blocks a cross-file ES module `import`. This app
already cannot run from `file://` at all — File System Access has no
`file://` story, and neither does fetching a mesh binary — so there is no
constraint left to design `scene.js`/`app.js` around, and `import * as THREE
from "three"` is simply the native, un-bundled way to consume the vendored
ES-module build. `config.js`/`storage/*.js`/`binding_state.js`/`fixtures.js`
stay classic scripts anyway, loaded before the module script: a classic
script runs synchronously as the parser reaches it, a `type="module"` script
is deferred by spec, so `window.AnnotateApp` is fully built by the time
`app.js` runs.

## Tests

```powershell
node apps\annotate\run_tests.cjs
```

Covers `binding_state.js` (the vocabulary hand-copy against
`tolerance_stack/feature_identity.py`, stack-key equality, binding-state
derivation including the staleness-flip case, event construction and its
validation) and `storage/memory.js` (a write is captured; a second write to
the same filename refuses, append-only; `canWrite() === false` refuses a
write instead of silently no-op'ing).

`scene.js` (three.js, WebGL, real click raycasting) is **not** exercised by
`run_tests.cjs` — there is no WebGL in Node, and this repo's own
step_tessellation lesson documents why real browser click automation is not
run on this machine (headless Chrome/Edge here reuses Jeff's own visible
browser session rather than running invisibly). `?autotest=1` is the
spike's own alternative: it aims the camera at each open part's own
bounding-box center and raycasts dead-center, publishing the result into
`#test-status` and `window.__autotestResults` — the fetch → geometry →
raycast → face_id path, exercised with no real mouse. **Recommend Jeff open
the page once himself** for a real visual/interaction confirmation; that
step was not done in this session (same recommendation the spike's own
lesson made, for the same reason).
