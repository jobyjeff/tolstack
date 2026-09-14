---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-14 — annotate_affordances_flyout_and_mesh_gating: no dead "open in 3D" links, and every 3D affordance drives the flyout

Source: Jeff, strategy session 2026-09-14: "all the thumbnails in tolstack
have an 'open this part in 3d' and many of them just dead-end since
there's no .step data. the UI shouldn't offer dead links." And: "was
hoping the 3d annotator flyout would be a flyout panel in the same page as
tolstack, currently it just opens a new tab." Baseline: `integration`.
Scope: `apps/viewer/` (`views/cards.js`, `views/topology.js` detail pane,
`topology_app.js` flyout wiring, `topology.js` view-model) +
`scripts/build_topology_projection.py` for the availability fact + tests.
Do NOT touch viewer layout/leader/grid geometry (owned by the
active/staged viewer handoffs); do NOT touch `apps/annotate/` internals
(its command vocabulary is the contract, use it as-is); do NOT rename or
re-tessellate anything under `data/meshes/`.

## Ground truth (verified 2026-09-14)

Installed meshes: exactly TWO (`machined_213668`, `blade_oml` — main
checkout `data/meshes/*/provenance.json`). Alias table
(`docs/topologies/part_mesh_aliases.json`): exactly ONE entry
(`gas_spring_mount_213668_002` → `machined_213668`). So of ~29 topology
parts, ONE currently resolves to an installed mesh — nearly every
"open in 3D" card link dead-ends in the annotator's empty state. A
sibling rotorkit handoff (`assembly_step_part_extraction`) will grow the
mesh set; this handoff makes the viewer honest at ANY mesh count.

## Deliverables

1. **Mesh availability becomes a projection fact.** The viewer cannot read
   `docs/topologies/part_mesh_aliases.json` or `data/meshes/` under the
   drawing-checker mount (docs/ is unmounted by design; FSA and the mount
   must behave identically). So `build_topology_projection.py` stamps each
   topology part with mesh availability at build time: resolve the part id
   through the alias table against the installed meshes' `provenance.json`
   `part_id`s — the same resolution order the annotator uses
   (`apps/annotate/commands.js` `resolveMeshIdentifier`: direct match
   first, alias second, never fuzzy). Suggestion: a `mesh` field per part
   (`{installed: true, part_id: …}` / `{installed: false}`) — always
   present, never omitted-means-anything.
2. **No dead 3D links.** A card / thumbnail / detail-pane "open this part
   in 3D" affordance renders ONLY when the part's projection fact says a
   mesh is installed. Absent shows nothing (the standing rule: a disabled
   feature shows NOTHING — no greyed button, no explanation). The one
   deliberate exception: the gap-flow "annotate this →" / "attach to 3D"
   on an UNTRACED/NO-CITATION edge exists to CREATE a binding — keep it
   when the edge's owning part has a mesh; when it has none, it goes too
   (an annotator without the part's mesh cannot bind a face; the honest
   fix is installing the mesh, and the gap stays on the gap list either
   way).
3. **Every surviving 3D affordance drives the flyout, not a new tab.**
   `study_3d_flyout` (2026-09-10) upgraded only the toolbar study
   affordance and the detail pane's attach-to-3D; the hover cards'
   annotator links still open a new tab even when the flyout is live.
   When `VA.probeAnnotateMount` succeeded, ALL annotate affordances —
   cards included — route through the one flyout panel via the existing
   `postMessage`/`AA.exec` command path (`VA.annotateExecCommands`).
   Where the probe failed (file:// without the sibling app, hosted without
   the bake), they stay plain links exactly as today — a working link,
   never a broken panel.

## Definition of done

- Real data (`--repo C:\workspace\tolstack`): exactly the gas-spring-mount
  part offers "open in 3D" today, it opens in the flyout on the local
  drawing-checker mount (`http://127.0.0.1:8000/tolstack/viewer/`), and no
  other part shows any 3D affordance; installing a second mesh + alias in
  a test fixture flips exactly that part's affordances on after a
  projection rebuild — no code change.
- Fast + truth tiers green; the `[real]` alias-pairing tiers still pass;
  a fixture-tier case covers installed/not-installed/aliased/unaliased
  parts through the new projection field (fixtures.js key-union guard will
  demand the new field — add it there too).
- Lesson: the projection field shape; which affordances were rewired to
  the flyout and any that deliberately stayed links (say why).
