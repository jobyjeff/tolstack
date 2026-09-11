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
- Lists every installed mesh (`data/meshes/`) in a **parts panel** with a
  show/hide checkbox and an **isolate** action per part (handoff
  `annotate_deep_link_and_part_filter`) — single-part granularity only;
  subtree-level filtering ("hide the whole EPU") needs assembly product
  structure this repo does not have yet.
- Boots from a **deep link** (`?topology=&edge=&study=&isolate=`) with that
  study open, the edge selected, and the named part(s) isolated — see "Deep
  link in" below.
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

## The command layer

Every scene/navigation operation the UI offers is a named, text-addressable
verb dispatched through one registry (`commands.js`'s `AA.CommandLayer`,
handoff `annotate_deep_link_and_part_filter`) — the architecture is deliberate:
**the UI is a thin shell over CLI-shaped commands**, because the follow-on arc
is a vision-agent driver operating this surface with vision + text commands
(zoom/pan/rotate/filter/select), not a human mouse forever. The deep link
below and the parts panel are its first two consumers; the dev console
(bottom of the 3D pane, or `window.AnnotateApp.exec(...)` from a browser
devtools console) is the third, and the shape a future agent driver's own
tool calls would take.

| verb | does |
|---|---|
| `open-part <mesh-id\|part>` | loads a mesh (sha256 or its `provenance.json` `part_id`) and shows it |
| `show <part>` | same as `open-part` — a part never opened is opened and shown |
| `hide <part>` | hides an open part (`.visible = false`; not unloaded, so re-showing is instant) |
| `isolate <part…>` | shows only the named part(s), hiding every other open part; opens any not yet loaded; frames the camera on them |
| `camera reset` | frames every currently-visible open part |
| `camera frame <part…>` | frames the named part(s) (or the visible ones, with no args) |
| `select-face <part> <face_id>` | picks a face by id — the non-mouse equivalent of clicking it |
| `select-topology <id>` / `select-study <id>` / `select-edge <id>` | the three steps `goto` composes, addressable one at a time |
| `goto <topology> <edge> [study]` | the deep link's own boot command: selects the topology, the study (named, or the first one whose selection carries the edge), and the edge |

`resolveMeshIdentifier`/`planIsolate` (the pure identifier-resolution and
isolate state-transition helpers) and the tokenizer/dispatch registry itself
are DOM-free (`commands.js`) and covered by `run_tests.cjs`; the handlers
(`app.js`, closing over `state`/`scene`/`storage`) are exercised through
`?mock=1&autotest=1` and manual use, the same split `binding_state.js` already
draws between logic and wiring.

## Deep link in

`?topology=<id>&edge=<id>&study=<id>&isolate=<part>[,<part>…]` boots the app
with that study open, that edge selected, and the named part(s) isolated —
implemented entirely as `goto`/`isolate` command-layer calls at boot
(`app.js`'s `runPendingDeepLink`), never a parallel code path. `study` is
optional: omitted, the first study whose selection carries `edge` is used.
`isolate` accepts a comma-separated list of mesh sha256s or `part_id`s; a
named part with no installed mesh is reported in the banner (and, if
*nothing* named resolved, as a plain-words message over the 3D pane itself —
never a blank scene) rather than silently doing nothing.

**FSA cannot pre-grant the folder from a URL.** A deep link opened cold has
no folder access yet — the banner says so ("a linked element is queued"),
and the boot commands replay only after you click **Connect folder**.

`apps/viewer/`'s topology-mode detail pane emits this link (`annotate this
→`) on any edge whose confidence is `UNTRACED` or `NO CITATION`, naming its
`part` field as `isolate` — see `apps/viewer/README.md`'s own section on it.
That `part` is the topology's own vocabulary (e.g. `gas_spring_mount_213668_
002`), a different namespace than a mesh's `provenance.json` `part_id` (e.g.
`machined_213668`). The tracked alias table
`docs/topologies/part_mesh_aliases.json` is the one sanctioned bridge between
the two (handoff `mesh_part_alias_table`; `data/meshes/README.md` carries the
install-time rule — alias, never rename): `resolveMeshIdentifier` consults it
after a direct sha256/`part_id` match misses, exact-match only, never fuzzy.
Every entry declares its evidence — a pair whose identity cannot be evidenced
stays unmapped, so a link naming an unmapped or uninstalled part still lands
on the empty state naming what's missing: the intended, honest result, not a
bug.

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
  commands.js          PURE command layer: tokenizer, the CommandLayer
                       registry, mesh-identifier resolution, the isolate
                       state-transition helper -- no DOM, no scene, no fetch.
                       app.js registers the actual (impure) handlers onto it.
  scene.js             the 3D surface: three.js mesh loading (through the
                       storage adapter, never fetch() directly), raycast,
                       highlight, part show/hide/frame. ES module (ADR below).
  app.js               boot + wiring. ES module.
  fixtures.js          the ?mock=1 demo dataset
  storage/adapter.js   the read/write adapter contract
  storage/fsa.js       File System Access, mode: "readwrite"
  storage/memory.js    in-memory mock (?mock=1, tests) -- captures writes
                       rather than persisting them
  vendor/              three.js r169 + OrbitControls, copied verbatim from
                       rotorkit's spike (see vendor/README.md)
  run_tests.cjs        fast-tier runner for binding_state.js + commands.js +
                       storage/memory.js
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
venv-win\Scripts\python.exe -m pytest tests\test_annotate_js_vocabulary.py -q
```

`run_tests.cjs` covers `binding_state.js` (stack-key equality, binding-state
derivation including the staleness-flip case, event construction and its
validation), `commands.js` (the tokenizer, `CommandLayer.exec` dispatching a
string or an already-tokenized array to its handler and throwing a
known-verbs-naming error for an unknown one, `resolveMeshIdentifier`'s
sha256/part_id/alias resolution precedence — direct match wins, the alias
table is consulted second, exact-match only — and `planIsolate`'s
open/show/hide state transition) and `storage/memory.js` (a write is
captured; a second write to the same filename refuses, append-only;
`canWrite() === false` refuses a write instead of silently no-op'ing). It
also carries a `[real]` tier that resolves every shipped alias in
`docs/topologies/part_mesh_aliases.json` against the main checkout's
installed meshes through `resolveMeshIdentifier` itself, skipping honestly
where `data/meshes/` is absent; `tests/test_part_mesh_aliases.py` owns the
table's own shape and its two vocabulary pairings.
`tests/test_annotate_js_vocabulary.py`
(pytest, not the node harness) pairs `binding_state.js`'s five hand-copied
vocabulary arrays (`STACK_KEY_KINDS`, `VERDICTS`, `DIRECTIONS`, `PATH_KINDS`,
`GDT_MODIFIERS`) against `tolerance_stack/feature_identity.py`'s own
definitions — the `tests/test_js_python_vocabulary.py` shape, generalised to
a second app's namespace — so a vocabulary word added to one side with no
matching literal on the other fails there, structurally, rather than only
being caught if a value drift happens to reach live data.

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

### Orbit up-axis (handoff `annotate_deep_link_and_part_filter`, deliverable 5)

CATIA STEP exports are Z-up; three.js's `OrbitControls` assumes Y-up by
default and bakes `camera.up` into a fixed quaternion **at construction
time**, not on every update. `scene.js`'s constructor now sets
`camera.up.copy(UP_AXIS)` (`(0, 0, 1)`) before constructing `OrbitControls`,
fixing Jeff's live report that horizontal drag sometimes orbited about the
vertical axis and sometimes about the axis normal to the screen depending on
view angle — the classic Y-up-control-on-a-Z-up-mesh symptom. `frameParts`
and `autotestPick` both offset the camera along `BACK_AXIS` (perpendicular to
`UP_AXIS`) rather than the old hard-coded `+Z`, so every `camera` command
stays consistent with the fix. Not exercised by `run_tests.cjs` (no WebGL in
Node, same as the rest of `scene.js`) — verify by opening the page and
dragging; recommended alongside the general open-it-once check above.
