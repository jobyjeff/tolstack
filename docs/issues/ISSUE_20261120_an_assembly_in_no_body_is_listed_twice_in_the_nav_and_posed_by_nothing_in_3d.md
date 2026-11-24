---
type: bug
priority: med
status: triaged
strategy: dispatch/docs/strategy/drafts/DRAFT_tolerance_analysis_over_the_kinematic_model.md
area: viewer/nav, annotate/sweep
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261119_an_assembly_is_an_outline_and_its_parts_may_sit_in_two_bodies.md
---

# An assembly in no body is listed twice in the nav and posed by nothing in 3D

Since 2026-11-19 (`an_assembly_is_an_outline_and_its_parts_may_sit_in_two_bodies`)
an assembly whose parts sit in two bodies is in **no** body
(`Topology.body_of` is `None`; the model view writes `body: null`). No
committed model has one yet: links 4 and 5 of the chain re-author v2 with
it. That handoff changed the schema, the model view and the map; two other
surfaces read a part's body and were out of its scope. Both are latent until
v2 is re-authored, and both are reachable then.

| Site | What it assumes | What it would do with v2's link assemblies in no body |
|---|---|---|
| `apps/viewer/model.js`, `unbodied` (read by `apps/viewer/views/nav.js`, `modelSections`) | a part with `body: null` and no parent is a part of a model with no bodies | lists each link assembly under the "no body" section **with its whole subtree**, while every part in it is also listed under its own body -- each race twice |
| `apps/annotate/sweep.js`, `AA.sweepRidingParts`; `apps/annotate/app.js`, `anchorSweepBodies` | every part with a mesh is listed in exactly one body, which poses it | an assembly mesh in no body (212956-005 has one) is posed by no body in sweep mode and drawn nowhere, or at its rest place |

Neither is a one-line fix; each needs a decision:

- **The nav.** Options: (a) list an assembly in no body nowhere but inside
  each body, as a "part of" note on its members; (b) a third section,
  "Assemblies across bodies", listing the assembly with its members as links
  into their bodies rather than as copies; (c) leave it in the "no body"
  section but with its members shown as references. Recommendation: (b) --
  it says the two groupings are two, which is what Jeff's note asked for, and
  it never shows a part twice as if it were two parts.
- **3D.** A mesh of an assembly whose parts move apart cannot be posed as one
  rigid thing. Options: (a) never draw an assembly mesh in sweep mode, only
  its members' meshes (needs members to have meshes -- the bearings' races
  do not today); (b) draw it at rest, faint, outside the sweep; (c) require
  link 4 to give each member its own mesh before the assembly leaves its
  body. Recommendation: decide with link 4, which is the handoff that makes
  the case real.

## Addendum 2026-11-20 -- live on v2 since a_link_is_a_machined_part_and_two_bearings_each_two_races

v2's two link assemblies and four bearings are now in no body. The nav's
"Parts" section lists `213862-002 pitch link` and `212956-005 pitch
anti-rotation link` whole (7 parts each), so each machined link and race is
listed twice: once under its body and once in its assembly
(`docs/sessions/lessons/shots/a_link_is_a_machined_part_and_two_bearings_each_two_races/tree_pitch_link_open.png`).
In 3D, sweep mode is unaffected (it poses the parts linkage lists, the
assembly meshes); out of it the link is drawn by its assembly, machined and
bearing meshes at once. The races declare no occurrence on purpose (that
handoff's lesson, "3D"). Still a design call; nothing changed here.

## Addendum 2026-11-23 -- the nav half is done (the_tree_sits_beside_the_3d_canvas_and_holds_still)

The tree lists each part once. An assembly in no body sits under "Across
bodies" with only those of its parts that are in no body either (v2: each
link assembly and its two bearings). Every machined link and race is listed
under the body it moves with, and nowhere else (`VA.navPlan`,
`apps/viewer/views/nav.js`). It is close to option (c) above: the members are
not repeated, not even as references. The 3D half (an assembly mesh in no
body, posed by no body in sweep mode) is unchanged and still open.
