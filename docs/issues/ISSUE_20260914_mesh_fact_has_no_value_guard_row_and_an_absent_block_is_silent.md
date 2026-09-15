---
type: bug
priority: med
status: triaged
area: viewer/projections
reporter: agent
handoff: docs/sessions/HANDOFF_20260914_projection_field_guard_rows.md
---

# `parts[].mesh` has no `TOPO_VALUE_GUARDS` row, and an absent block is silent

Filed from the review of `annotate_affordances_flyout_and_mesh_gating`
(2026-09-14). The handoff added a new enumerated projection field the page
switches on — `topologies[].parts[].mesh.installed`, which decides whether every
3D affordance renders — and it did not join the class of guards this repo
already keeps for exactly that kind of field.

## 1. No value-guard row

`apps/viewer/tests.js`'s `TOPO_VALUE_GUARDS` has eight rows (`layout.rows[].kind`,
`layout.links[].kind`, `edges[].value_source`, `studies[].status`,
`edges[].confidence`, `nodes[].kind`, `edges[].kind`,
`edges[].transform.kind`), driven by
`[real] no live topology value is one the page cannot render`. `parts[].mesh` is
not among them. The row would be cheap and it would bite in the direction that
matters: its `values()` collector going empty is itself reported ("no live value
found — either the collector is wrong or the builder stopped writing it"), which
is the case a boolean's own value set cannot catch.

`docs/prompts/REVIEW_AGENT.md`'s architectural entry states the rule directly:
*"whether a field is covered is no longer yours to enumerate; read the rows"* and
*"when a second file joins a class the repo already guards, list that class's
guards and check the newcomer is in each one."*

## 2. A stale projection and "no mesh is installed" are one silent state

`VA.partMeshFact` returns `VA.MESH_FACT_ABSENT` both when the projection says
`{"installed": false}` and when the `mesh` key is **absent** — a projection built
before this field existed. Both read as "no mesh", and the page says nothing
either way.

That absent state is reachable **today**, not hypothetically: nothing rebuilds
`data/projections/viewer/`, so every copy of `topologies.json` built before this
merge has no `mesh` key, and every 3D affordance in the app silently disappears
until someone rebuilds. The author reasoned about this in a comment and chose
silence deliberately ("the safe direction — a dead link is the failure being
fixed"), which is a defensible call for the *no mesh installed* case and the
handoff's own standing rule ("a disabled feature shows NOTHING").

What is not settled is the *stale projection* case. This repo's established
answer for an unknown/absent projection value is a **loud** surface — a named
`VA.unlabelled*Text` plus a banner rollup line for the reader who never hovers
(`viewer_source_ref_export_label` 2026-08-11, and `VA.VERDICT_SCOPES`'
silent-fallback miss in `check_completeness_schema` 2026-08-13, whose lesson
records that *"a new projection field's reachable unknown value is `undefined`,
not a new vocabulary word, because nothing rebuilds the projection and a
projection built before the field existed simply has no key"*). The topology page
already has a banner that reports build time and a Rebuild affordance, so the
surface exists; nothing routes this condition to it.

Not treated as blocking: nothing is *misread* here, a capability is merely
absent, and the state self-heals on a rebuild. But the page currently cannot
distinguish "this part has no 3D model" from "this projection is older than the
field", and that is the distinction this repo normally insists on stating.

The review corrected `apps/viewer/topology.js`'s comment above
`VA.MESH_FACT_FIELDS`, which claimed `VA.partMeshFact` is "where that
distinction is made" — it is where the two are deliberately merged.
