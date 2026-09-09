# Lesson — inline_edge_crops (worked 2026-09-08)

Handoff `HANDOFF_20260908_inline_edge_crops.md`, branch `handoff/inline_edge_crops`,
cut from `integration` (following `topology_schema_v1`, merged). Deliverable: give
a drawing-cited **inline** topology edge a crop, the same way a `dimension_ref`
edge already gets one — pitch_system's 6 drawing-cited edges had 0 crop_keys and
0 thumbnails before this session, despite carrying real drawing `source_ref`s.

## What changed

- **`scripts/build_topology_projection.py`**
  - New `_croppable(source_ref)`: true iff `source_ref.export is not None` or
    `source_ref.kind == "spec"` — the same two rules
    `build_viewer_crops.resolve_pdf` implements as rule 1
    (`source_ref_export`) and rule 2 (`spec_pile`). Deliberately never rule 3
    (the legacy `joint.assembly_export`): that rule borrows from a STACK's own
    `joint` block, and an inline edge is in no stack to borrow from. This
    check touches no filesystem — it only decides whether a lookup key
    exists, never whether the citation actually resolves.
  - `crop_key(edge)` became `crop_key(topology, edge)` (call site in
    `project_edge` updated). Behaviour for a `dimension_ref` edge is
    unchanged. For an **inline** edge whose dimension's `source_ref` is
    croppable, it now returns `{"topology": topology.id, "edge": edge.id}` —
    a new, **separate** key space from `{"stack": ..., "element": ...}`, not
    a relabelling of it.

- **`scripts/build_viewer_crops.py`**
  - `crop_element` was split into a shared `_crop_from_citation(raw,
    source_ref, hardware_ref, name_stem, no_ref_reason, ...)` plus two thin
    wrappers: `crop_element` (unchanged behaviour, stacks) and the new
    `crop_topology_edge` (topology inline edges, always calling
    `resolve_pdf` with `raw={}` — a topology document has no `joint` block,
    so the legacy rule 3 simply never matches one, correctly).
  - `main()` gained a second scan, after the stack scan and after `summary`
    is already computed from it: `docs/topologies/*.json`, every edge with an
    inline `dimension` and no `dimension_ref`, resolved through
    `crop_topology_edge`. Output lands in **new, additive** top-level keys:
    `by_topology`, `unresolved_topology`, `summary_topology`. The pre-existing
    `by_stack`/`unresolved`/`summary` are untouched — verified by diffing a
    real rebuild of this branch's code against a rebuild with the
    pre-handoff script on the same tree (see Verification).
  - `build_index()` gained three optional keyword arguments (default to
    empty), so `tests/test_projection_provenance.py`'s existing 6-positional-arg
    call still gets the pre-handoff shape back, just with three more
    (empty) keys.

- **Tests**: `tests/test_topology_projection.py` — rewrote the now-false
  `test_an_inline_dimension_has_no_crop_key` into two tests reflecting the
  real pitch_system census (6 keyed, 18 not), a fixture test with the
  handoff's own three-edge shape (drawing / workbook / `dimension_ref`), and
  a parametrized `_croppable` test. `tests/test_viewer_crops.py` — a
  `build_index` unit test pinning the "topology args are additive" claim, and
  one more showing rule 1 resolves fine against an empty `raw` (what
  `crop_topology_edge` always passes).

## The key-space decision, and why `by_stack` was never an option

The suggested key shape (`"<topology_id>:<edge_id>"`, a single string) was not
what I built. I used a `{topology, edge}` dict instead, in a **new**
`by_topology` bucket — not, as I first considered, reusing `by_stack` keyed
under the topology's own id with `{"stack": topology_id, "element": edge_id}`.
That second option would have made `apps/viewer`'s existing `VA.cropFor`
resolve the new keys with **zero viewer edits**, which was tempting. I rejected
it because **`topology_vpa_output_to_pitch_plate.json`'s own `id` is
`vpa_output_to_pitch_plate` — identical to the stack `id` it re-expresses**
(`docs/tolerance_stacks/stack_vpa_output_to_pitch_plate.json`). Landing an
inline edge's crop in `by_stack["vpa_output_to_pitch_plate"][edge_id]` would
share one dict with that stack's own `by_stack["vpa_output_to_pitch_plate"]
[element_id]` entries — a real collision risk the moment any topology whose id
equals a stack's id gets an inline edge whose id equals one of that stack's
element ids. `vpa_output_to_pitch_plate` has no inline edges today (all 7 are
`dimension_ref`), so the collision doesn't fire yet — but the whole reason to
choose the shape now, correctly, is that it doesn't wait for a session that
adds one to discover it.

## Deliverable 3 — viewer compatibility: verified, and it does NOT resolve as-is

Read (not edited) `apps/viewer/viewer.js`, `topology.js`, `topology_app.js`,
`views/topology.js`. `VA.cropFor(cropsIndex, stackId, elementId)`
(`viewer.js:543`) reads only `cropsIndex.by_stack[stackId][elementId]`, and
every call site reads `edge.crop_key.stack` / `edge.crop_key.element`
specifically (`topology_app.js:269-270`, `views/topology.js:463-464` and
`746-764`). My `crop_key` for an inline edge carries `.topology`/`.edge`
instead, so today, for each of pitch_system's 6 newly-keyed edges:

- `edge.crop_key` is truthy, so the viewer's "no crop index covers it — that
  is the state of the documents" branch (the correct message it showed
  *before* this handoff) no longer fires.
- `edge.crop_key.stack` / `.element` are both `undefined`, so
  `VA.cropFor(crops, undefined, undefined)` reads `by_stack[undefined]` →
  `{}[undefined]` → falls to the **`no-entry`** case: "crops.json has no
  entry for this element — it is older than the stack; re-run the crop
  script".

That message is wrong for these 6 edges (crops.json is current and does have
an entry — just not where the viewer is looking), so this is a **real, if
narrow, interim UX regression** for the pitch_system topology view until
`viewer_v2_single_nav` picks up `by_topology`. The handoff anticipated exactly
this outcome and named it acceptable ("If it genuinely cannot without an
apps/viewer edit, do NOT make that edit... still land the builder side"), so I
did not touch `apps/viewer/` at all. Precisely what `viewer_v2_single_nav`
needs to add, so the next session doesn't have to re-derive it:

1. `viewer.js`'s `VA.cropFor` (or a new sibling, e.g. `VA.cropForKey(crops,
   key)`) needs to branch on which fields `key` carries — `{stack, element}`
   → `crops.by_stack`, `{topology, edge}` → `crops.by_topology` — and return
   the same four-state shape (`not-built` / `no-entry` / `unresolvable` /
   resolved entry) either way.
2. Three call sites need to use it instead of reading `.stack`/`.element`
   unconditionally: `topology_app.js:269-270` (the preload path),
   `views/topology.js:463-464` (whatever reads a status class from the
   trigger) and `views/topology.js:743-786` (`cropSection`, the detail-pane
   renderer — the `"from stack `" + edge.crop_key.stack + "`..."` line at
   762-764 also needs a topology-aware phrasing).
3. `topology.js:383-391` (the "which stacks does this topology cover" scan,
   `if (e.crop_key && e.crop_key.stack) covered[e.crop_key.stack] = true`)
   needs **no change** — it already guards on `.stack` specifically, so a
   `{topology, edge}` key is silently and correctly skipped there today.

## Census after (pitch_system, real rebuild against the main checkout's data)

Verified with a real rebuild — this repo's venv for the topology projection,
drawing-checker's venv for crops — against an **isolated scratch data root**
(never the shared `C:\workspace\tolstack\data\`, to avoid clobbering it from a
tree 7 commits behind master; see Verification):

- `pitch_system`: **6 of 24** inline edges now carry a crop_key and resolve
  (all 6 sha256-verified, rule `source_ref_export`):
  `hub_blade_root_seat_position`, `end_stop_clearance`, `piston_length`,
  `pitch_plate_flange_to_link_hole`, `gas_spring_body_height`,
  `gas_spring_mount_position`. The other 18 (9 `workbook`, 9 `assumed`) carry
  no crop_key and land in `unresolved_topology` with an honest reason each
  (`"the source is a spreadsheet, not a drawing or spec PDF"` /
  `"source_ref names no document"`), never an error.
- `vpa_output_to_pitch_plate`: unaffected — all 7 edges are `dimension_ref`,
  so none of this session's code paths touch them; still 6 keyed / 1 derived
  gap, exactly as before.
- The 7 stacks' own `by_stack`/`unresolved`/`summary` are **unchanged**,
  confirmed by diffing a build with this branch's code against a build with
  the unmodified pre-handoff script, both against the identical tree (see
  Verification) — not merely "the numbers look similar".

## What I chose not to do

- **Update `ARCHITECTURE.md`'s stack pipeline diagram** (the
  `docs/tolerance_stacks/*.json -> build_viewer_crops.py -> crops.json`
  ASCII flow, lines ~376-397). That diagram already doesn't show the
  topology archetype anywhere — `build_topology_projection.py` and
  `docs/topologies/*.json` were added 2026-08-31 and still aren't in it, and
  `topology_schema_v1` (2026-09-08, immediately prior) touched
  `build_topology_projection.py` substantially without updating this diagram
  either. I followed that precedent rather than being the first to fold the
  topology archetype into a diagram scoped to the original stack-only
  pipeline; `docs/DAG_TOPOLOGY.md` is where topology-side projection
  behaviour is documented.
- **Any `apps/viewer/` edit.** See "Deliverable 3" above — investigated,
  verified it does not resolve as-is, documented precisely, left untouched
  per the handoff's own instruction (that tree is `viewer_v2_single_nav`'s).
- **Reusing `by_stack` for inline edges**, even though it would have made the
  viewer "just work". See "The key-space decision" above.

## Verification

- `venv-win\Scripts\python.exe -m pytest -q`: 692 passed, 1 skipped (the
  skip is `REQUIREMENTS_PULL`-gated and pre-existing, unrelated to this
  session).
- Real rebuild, isolated scratch data root (never the shared
  `C:\workspace\tolstack\data\`, which this branch is 7 commits behind
  master and would have been refused/misleading to overwrite):
  - `venv-win\Scripts\python.exe scripts\build_topology_projection.py
    --data-root <scratch>` — 24 pitch_system edges, unchanged layout/fold
    numbers.
  - `C:\workspace\drawing-checker\venv-win\Scripts\python.exe
    scripts\build_viewer_crops.py --data-root <scratch> --stacks-dir
    <worktree>\docs\tolerance_stacks --topologies-dir
    <worktree>\docs\topologies --drawing-checker-root
    C:\workspace\drawing-checker` — 21/59 stack citations resolved (matches
    a from-scratch run of the **unmodified** pre-handoff script against the
    identical tree, run side-by-side for this check and then discarded —
    the difference from the main checkout's own 37/22 is this branch being
    behind master's stack citations, not this session's code), 6/24
    topology inline citations resolved, all 6 sha256-verified, 18
    unresolvable with the expected reasons. `by_stack`/`unresolved`/`summary`
    JSON-equal between the two runs.
  - Confirmed the 6 rendered PNGs exist under `<scratch>\...\crops\` and
    `crops.json`'s `by_topology.pitch_system` has exactly the 24 keys
    expected, with `status`/`reason` matching the printed report.
