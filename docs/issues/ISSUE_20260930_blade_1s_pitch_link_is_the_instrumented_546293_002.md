---
type: bug
priority: med
status: open
area: topologies
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260930_vpa_pitch_linkage_topology_and_feature_fits.md
---

# Blade 1's pitch link is `546293-002`, the instrumented variant — not `213862-002`

## What the new extraction showed

`docs/topologies/topology_vpa_pitch_linkage.json` declares its `pitch_link` part
with drawing `213862-002`, on the strength of `216231 B.1` find 30,
`PITCH LINK ASSEMBLY, PROPELLER`. That is right for the design and wrong for
**blade 1**, which is the blade the whole document is about.

rotorkit's `assembly_extract_20261001T022446Z` (which landed mid-session, after
the topology was authored) installed the pitch-link assemblies and they are not
all the same part:

| product | instances | |
|---|---|---|
| `546293-002` | `prd-e-03478612.1/213862-002.1` | `INSTRUMENTED PITCH LINK ASSEMBLY`, 216231 B.1 find 29 |
| `213862-002` | `…/213862-002.2` … `.5` | `PITCH LINK ASSEMBLY, PROPELLER`, find 30 |

Five pitch links; the one at instance `.1` is the instrumented variant. The two
MS14101-3 bearings this handoff fitted — and the two joint centres its
`pitch_link_length` edge is about — sit inside that `.1`.

The instrumented blade is the same story one level up: `551438-001`
`PROPELLER BLADE INSTRUMENTATION` (find 2) against `216332-001`
`BLADE BONDED ASSEMBLY` (find 19), and the topology's `blade_root` carries the
latter.

## Why it is not simply a wrong number to correct

The kinematics are the same link. The two fitted ball centres agree with the
3DX sweep sheet's own Pitch Arm and Pitch Plate nodes at 72° to under two
microns per axis, and the sheet is a model of the mechanism rather than of one
instrumented article. So `213862-002` is the right drawing for *the pitch link
of this mechanism*, and `546293-002` is the right drawing for *the hardware
blade 1 carries in the build this STEP is of*.

Which one a topology part should name is a question this repo has not had to
answer before, and it is the same question for `blade_root`:

- **name the design part** (`213862-002`) and the fitted geometry's provenance
  points at a different drawing than the part does;
- **name the as-built part** (`546293-002`) and the document stops describing
  the mechanism and starts describing one test article — and goes stale when the
  instrumentation comes off;
- **carry both**, which `Part` has no field for today (`drawing`/`revision`/`note`).

A solver consuming `fits.json` is unaffected either way — it gets coordinates
and an instance path. A *reader* of the topology is not: today the part says
`213862-002` and the geometry behind its two most important nodes is
`546293-002`'s, which is exactly the kind of quiet disagreement the alias table
exists to prevent one level down.

## Interim state

The `pitch_link` part's `note` states the finding in full and points here; no
number was changed. `docs/topologies/part_mesh_aliases.json` has **no** row for
`546293-002` or for `213862-002` — the pitch-link bodies were not aliased in
this handoff, so nothing resolves to either mesh yet, and whichever way this is
decided there is no row to unpick.

## Done when

`topology_vpa_pitch_linkage.json`'s `pitch_link` and `blade_root` parts name the
drawing this repo has decided a topology part should name, with the rule written
down once — in `docs/DAG_TOPOLOGY.md`'s `Part` section, since it applies to every
topology and not only this one.
