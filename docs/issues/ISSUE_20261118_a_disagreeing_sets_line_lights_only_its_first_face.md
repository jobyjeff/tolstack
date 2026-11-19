---
type: bug
priority: low
status: resolved
area: viewer / feature body hover
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261118_a_disagreement_is_settled_by_keep_or_let_go.md
---

# A line for a set of faces that disagree lights only its first face on hover

Since 2026-11-18 a feature whose sets of faces disagree draws one line per set
("faces 1380, 1381, 1509, 1510", with Keep naming the whole set —
`VA.featureBodyPlan`'s disagree branch, `apps/viewer/views/nav.js`). Hovering
the line posts `hover face <mesh> <face>` for the set's FIRST face only,
because a body line carries one `face` and the pane's `hover face` names one
face (`apps/viewer/topology_app.js` `bodyHoverFace`, `apps/annotate/app.js`
`cmdHover` → `AA.parseHover`).

So before pressing Keep the reader sees one face of the set lit, not the set
that Keep will bind. The same holds for a bound set's head line. Fix shape: a
line carries `faces`, and `hover face` takes several ids (the `camera face`
verb already does).

## Resolved 2026-11-18

By handoff `a_bound_pattern_offers_the_whole_pattern_on_the_other_part`, which
needed the same thing for its pattern row: a body line carries
`face.faceIds`, `hover face <mesh> <id>...` takes several ids
(`AA.parseHover`, `scene.washFace`), and the disagree branch puts each set's
ids on its line. Pinned in the viewer fast tier's "sets of faces that
disagree..." check. A bound set's head line still lights nothing (it carries
no face); its per-face lines each light one.
