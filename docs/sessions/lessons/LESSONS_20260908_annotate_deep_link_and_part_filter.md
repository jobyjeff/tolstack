# LESSONS 2026-09-08 — annotate_deep_link_and_part_filter

Handoff `docs/sessions/active/HANDOFF_20260908_annotate_deep_link_and_part_filter.md`,
built on `viewer_v2_single_nav` (merged into `integration`). Added a command
layer to `apps/annotate/`, a parts panel (show/hide/isolate), a deep link in
both directions (viewer → annotator), and fixed the orbit up-axis. Full suite
green: `750 passed, 1 skipped` (pytest), `32/32` (`apps/annotate/run_tests.cjs`,
20 new), `167/167` fixture tier + `210/211` real-data tier
(`apps/viewer/run_tests.cjs --repo`, the one failure being the pre-existing
`LESSONS_20260908_viewer_v2_single_nav.md` §7 branch-count race, unrelated).

## The command vocabulary as shipped — it is now agent-facing API, so read this before renaming a verb

| verb | args | does |
|---|---|---|
| `open-part` | `<mesh-id\|part>` | loads a mesh (sha256 or its `provenance.json` `part_id`) and shows it |
| `show` | `<part>` | alias of `open-part` — the same handler, registered under both verbs |
| `hide` | `<part>` | sets `mesh.visible = false`; never unloads, so re-showing is instant |
| `isolate` | `<part…>` (variadic) | shows only the named part(s), opening any not yet loaded, hiding every other open part, then frames the camera on them |
| `camera` | `reset` \| `frame <part…>` | `reset` frames every visible open part; `frame` with no args does the same, with args frames only those |
| `select-face` | `<part> <face_id>` | picks a face by id with no raycast — the non-mouse equivalent of a click |
| `select-topology` / `select-study` / `select-edge` | `<id>` | the three steps `goto` composes, addressable one at a time |
| `goto` | `<topology> <edge> [study]` | the deep link's own boot command |

`commands.js` is the DOM-free half (tokenizer, the `CommandLayer` registry,
`resolveMeshIdentifier`, `planIsolate`) — no scene, no storage, tested by
`run_tests.cjs` with plain arrays. `app.js` registers the actual handlers,
which close over `state`/`scene`/`storage`; every existing UI control
(topology/study `<select>`, an element row's click, the parts-panel
checkbox/isolate button, `?autotest=1`'s mesh-loading loop) now calls
`AA.exec([...])` instead of touching `state`/`scene` directly — there is one
dispatch point, and the deep link and the dev console are two more callers of
the identical verbs, not a parallel path.

**What a vision-agent driver would still need, concretely, on top of this**:

- **No `zoom`/`pan`/`rotate` verbs yet.** The handoff's suggested vocabulary
  named them; I shipped `camera reset`/`camera frame <part>` (both absolute
  placements) because that is what `isolate` and the deep link actually
  needed this session, and inventing a relative-orbit verb with no caller
  would be exactly the kind of gold-plating the tactical prompt warns against.
  A driver that wants to nudge the view incrementally (as opposed to "frame
  this part") has nothing to call yet.
- **`select-face` takes a face id, not a screen coordinate or a description.**
  A vision-agent driver reading a screenshot has pixel coordinates, not
  `face_id`s — it would need either a `pick <part> <ndc_x> <ndc_y>` verb (a
  thin wrapper over `scene.pick()`, which already exists and is what mouse
  clicks use) or to resolve a face id itself first via some other means. I
  did not add `pick` as a command because nothing in this handoff's scope
  calls it non-interactively; flagged here rather than built speculatively.
- **No verb reports "what's on screen" back out.** A driver narrating in text
  needs some way to ask "what parts are open, what's visible, what's
  selected" without a screenshot. `AA.exec` results already carry some of
  this (`isolate` returns `{opened, missing}`, `goto` returns
  `{topologyId, studyId, edgeId}`) but there is no `describe`/`status` verb
  that dumps the whole state. Left for whenever a driver actually needs it.
- **Command results are JS values, not JSON-safe strings** — the dev console
  `JSON.stringify`s them for display, which works for everything shipped
  (plain objects/arrays/strings) but would need attention if a future verb
  ever returned something non-serializable (a mesh object, say).

## Scope decisions not spelled out in the handoff

- **The topology edge's `part` field and a mesh's `provenance.json`
  `part_id` are two unmapped vocabularies.** Checked against real data: zero
  of `pitch_system`'s 12 parts match either installed mesh's `part_id`
  string. The viewer's deep link necessarily names the edge's own `part` as
  `isolate=` (it has nothing else to name), so **most real links will land on
  the empty state, not an isolated part**, until the two vocabularies are
  reconciled — filed as
  `docs/issues/ISSUE_20260908_topology_part_vocabulary_has_no_mesh_mapping.md`
  (`audience: strategy`, since the right fix is a naming-convention or
  mapping-table decision, not a mechanical one). This is not a bug in this
  session's work — deliverable 3's own empty-state requirement anticipates
  exactly this case — but it means the isolate half of the feature is mostly
  latent capability today, proven correct against the mock fixture
  (`?mock=1`'s `demo_edge_untraced` deliberately carries `part:
  "demo_triangle"`, matching the demo mesh's `part_id`, so there is one real
  end-to-end path to click through) rather than against live pitch_system
  data.
- **The viewer's deep link is relative (`../annotate/index.html?...`), not an
  absolute `config.js` URL.** A prior handoff (`annotation_surface_mvp`,
  2026-09-06) had already shipped a toolbar-level "Annotate →" link in this
  exact relative shape (`views/topology.js`'s `renderTopoToolbar`), on the
  assumption both apps are served as siblings under one static root — sound,
  since `apps/viewer` is launched by `file://` double-click (its own README)
  and therefore has no "own origin" to build an absolute link from anyway. I
  generalised that existing link-building rule (`VA.annotateLink`) to also
  carry `edge`/`isolate` rather than forking a second, absolute-URL
  convention with a guessed port — the toolbar's own link and the new
  detail-pane link are now the same function with different args, not two
  places a query-string format could drift apart.
- **The detail-pane link gates on `VA.needsAnnotation` (confidence
  `untraced`/`no_source_ref`), not on the feature-identity binding state.**
  The handoff says "untraced/unbound", and reading the real *binding* state
  would mean `apps/viewer/` fetching
  `data/projections/feature-identity/bindings.json` — a new projection read
  this handoff's own scope note ("the minimal link-emission touch in
  apps/viewer") argued against adding. Confidence is a value already on every
  edge the page renders, `untraced`/`no_source_ref` are this repo's own two
  loud gap states (`confidenceClass`'s comment), and they are a superset of
  "the row needs a citation or an identity" either way, so the link appears
  whenever there's real work an annotator visit could do, whether or not a
  binding already exists too (a binding is additive documentation, never a
  reason to hide the link — many-to-many is the schema's own point).
- **`goto`'s study argument, when omitted, is resolved by scanning for the
  first study whose `selection` carries the named edge**, not left null. Real
  topologies have edges that belong to more than one study (`pitch_system`'s
  four end-stop studies all share most of their chain), so "just the edge, no
  study" needed a sensible default rather than landing with no study open and
  an empty element list.
- **`select-topology`/`select-study`/`select-edge` are new verbs beyond the
  handoff's own suggested list** (`open-part`, `show`/`hide`, `isolate`,
  `camera`, `select-face`, `goto`). `goto <topology> <edge> [study]` cannot
  express "just change the topology" or "just change the study" (no edge to
  name), and the existing `<select>` dropdowns needed *something* to route
  through per deliverable 1's "the UI's existing interactions re-route
  through it" — these three are `goto`'s own steps, named separately, which
  is less code than inventing a fourth shape for "goto with an optional
  edge".

## The orbit up-axis fix (deliverable 5)

Confirmed the mechanism from `vendor/OrbitControls.js` itself before touching
anything: `this._quat = new Quaternion().setFromUnitVectors(object.up, new
Vector3(0, 1, 0))` runs **once, in the constructor** — not on every
`update()`. `scene.js` created the camera, then the controls, with
`camera.up` still at its three.js default `(0, 1, 0)`; CATIA STEP exports are
Z-up (the handoff's own statement), so every orbit was computed against the
wrong axis, matching Jeff's exact symptom (drag sometimes orbits about
vertical, sometimes about the screen normal, depending on view angle — which
angle determines how far off-axis the mismatched "up" happens to project).
Fix is one line, `this.camera.up.copy(UP_AXIS)`, inserted between camera
construction and `new OrbitControls(...)` — order matters, moving it after
construction would silently do nothing. `frameParts`/`autotestPick` both
switched their camera-offset math from a hard-coded `+Z` (which used to BE
"back, away from the model" when Y was up) to `BACK_AXIS` (0, -1, 0),
perpendicular to the new `UP_AXIS`, so every camera placement in the app
stays internally consistent with the fix rather than fighting it.

**Not verified against the real meshes visually** — no WebGL in Node, and
this repo's own `step_tessellation` spike lesson documents why real browser
click/drag automation is not run on this machine (it would hijack Jeff's live
browser session, not run invisibly). The fix is mechanically correct against
`OrbitControls`'s own documented behavior and the handoff's own stated Z-up
convention for CATIA exports, but **recommend Jeff open the page once
himself** and drag to confirm — the same recommendation every prior session
touching this app's 3D surface has made, for the same reason.

## What I did not touch

- `tolerance_stack/`, the projection builders, `docs/topologies/` — per the
  handoff's explicit fence.
- `data/meshes/`'s actual contents (no new tessellation run) — the mock
  fixture's synthetic `demo_triangle` mesh is the only new part-identity data
  this session added, and it lives in `fixtures.js`, not `data/`.
- The Playwright browser truth tier (`scripts/run_viewer_browser_tests.mjs`)
  — `node_modules/` was not installed in this worktree and my viewer changes
  are content/logic only (a new link element, a link-builder refactor with no
  behavior change for existing callers), not layout/CSS that tier's height-
  budget and alignment checks are built to catch. Fixture tier (167/167) and
  the real-projection node-fs tier (210/211) both exercise the new link
  against real `pitch_system` data already.

## Gotchas for the next agent

- **`OrbitControls` captures `camera.up` at construction, not read live.**
  If a future session wants a *configurable* up axis (a mesh whose CAD system
  is genuinely Y-up, say), it cannot just reassign `camera.up` later — it has
  to reconstruct `OrbitControls`, or the fix from this session, applied
  wrong, is the exact bug this session fixed.
- **A topology edge's `part` and a mesh's `provenance.json` `part_id` look
  like the same kind of thing and are not** — see the issue filed above
  before assuming a deep link's `isolate=` param will resolve to anything.
