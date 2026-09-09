---
type: feature
priority: low
status: open
area: docs/DAG_TOPOLOGY.md, data/meshes/
reporter: agent
audience: strategy
---

# A topology edge's `part` and a mesh's `provenance.json` `part_id` are two unmapped vocabularies, so most deep-link isolates land on the empty state

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

**Consequence, by design, not a bug**: today, clicking "annotate this →" on a
real untraced pitch_system edge boots the annotator with the right study and
edge selected, but the isolate almost always lands on the honest empty state
("no installed mesh for hub") rather than an isolated part — the handoff's own
Definition of Done anticipated exactly this ("if its part's mesh is installed"
is conditional), and the empty state is what deliverable 3 asked for
precisely for this case. But it means the isolate half of the feature will
rarely fire in practice until this gap closes, which is worth a session's
attention on its own.

**What a fix would need** (a strategy question, not an obvious mechanical
one — hence `audience: strategy`): either (a) a `data/meshes/README.md`
naming convention that mints a mesh's `part_id` FROM the topology's own part
id at install time (so `data/meshes/<sha>/provenance.json`'s `part_id` reads
`gas_spring_mount_213668_002` instead of `machined_213668`), or (b) an
explicit mapping table (topology part id -> mesh part_id/sha256) living
somewhere both `apps/annotate/` and the topology schema can read, or (c)
loosen `apps/annotate/commands.js`'s `resolveMeshIdentifier` to a fuzzy/
substring match (rejected here as exactly the kind of invented leniency this
repo avoids — `machined_213668` vs. `gas_spring_mount_213668_002` share
`213668` but a substring match would also collide on genuinely different
parts sharing a drawing-number digit run). Option (a) is the cheapest and
keeps the "nothing invented" posture, but it means re-tessellating/
re-installing the two existing meshes under new names, and needs a decision
on which side's spelling wins when a part is renamed later on either side.
