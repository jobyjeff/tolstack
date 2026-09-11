# STRATEGY BRIEF 2026-09-09 — topology_part_vocabulary_mesh_mapping: map a topology edge's `part` to a mesh's `provenance.json` `part_id`

> **CONSUMED 2026-09-10 — decided: option (b), a declared alias table
> (tracked config, exact-match only), per the locked
> `dispatch/docs/strategy/HANDOFF_20260910_tolstack_viewer_arcs_strategy.md`
> (which folded this brief into the viewer arc and steered "declared alias
> table, tracked config not code-guessing"). Expanded by the 2026-09-10
> orchestrator session → `docs/sessions/HANDOFF_20260910_mesh_part_alias_table.md`
> (staged). Option (a) rejected (re-tessellating/renaming installed meshes,
> and a rename-wins ambiguity); option (c) stays rejected per the filer.
> Aliases are declared from evidence only; unmappable parts stay unmapped
> (the honest empty state stands).**

> **Routing note.** `docs/issues/ISSUE_20260908_topology_part_vocabulary_has_no_mesh_mapping.md`
> is `type: feature`, `priority: low`, `audience: strategy` — the filer named
> this a design question, not an obvious mechanical fix.

## The gap, as filed

Handoff `annotate_deep_link_and_part_filter` (2026-09-08) wired a deep link
from `apps/viewer/`'s topology-mode detail pane into `apps/annotate/`, naming
an untraced/uncited edge's own `part` field as the `isolate=` param (e.g.
`gas_spring_mount_213668_002`, `hub`, `blade_root` — `docs/DAG_TOPOLOGY.md`'s
topology schema, authored per-edge). `apps/annotate/`'s parts panel and
`open-part`/`isolate` commands resolve an identifier against
`data/meshes/<sha256>/provenance.json`'s own `part_id` (e.g.
`machined_213668`, `blade_oml` — a rotorkit-tessellation-run naming, see
`data/meshes/README.md`). **Nothing in this repo maps one vocabulary to the
other.** Checked against the real `pitch_system` topology's own 12 parts and
the two installed meshes: zero exact-string matches.

## Consequence — by design, not a bug

Today, clicking "annotate this →" on a real untraced pitch_system edge boots
the annotator with the right study and edge selected, but the isolate almost
always lands on the honest empty state ("no installed mesh for hub") rather
than an isolated part — `annotate_deep_link_and_part_filter`'s own Definition
of Done anticipated exactly this ("if its part's mesh is installed" is
conditional), and the empty state is what that handoff's deliverable 3 asked
for precisely for this case. But it means the isolate half of the feature will
rarely fire in practice until this gap closes.

## Options already surfaced by the filer

- **(a)** A `data/meshes/README.md` naming convention that mints a mesh's
  `part_id` FROM the topology's own part id at install time (so
  `data/meshes/<sha>/provenance.json`'s `part_id` reads
  `gas_spring_mount_213668_002` instead of `machined_213668`). Cheapest, keeps
  the "nothing invented" posture, but means re-tessellating/re-installing the
  two existing meshes under new names and deciding which side's spelling wins
  when a part is renamed later on either side.
- **(b)** An explicit mapping table (topology part id → mesh part_id/sha256)
  living somewhere both `apps/annotate/` and the topology schema can read.
- **(c)** Loosen `apps/annotate/commands.js`'s `resolveMeshIdentifier` to a
  fuzzy/substring match — explicitly flagged by the filer as the wrong
  direction: `machined_213668` vs. `gas_spring_mount_213668_002` share
  `213668`, but a substring match would also collide on genuinely different
  parts sharing a drawing-number digit run. Included here only so the
  strategy session doesn't have to re-derive why it's rejected.

## Decompose into

Whichever option is chosen: (a) is a mesh-installation/naming convention
change plus re-running rotorkit's tessellation for the two existing meshes;
(b) is a new small mapping artifact plus wiring on both the annotate and
topology sides; both are single tactical handoffs once the convention is
picked.
