---
type: bug
priority: low
status: open
area: viewer/topology
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_respine_tween_fidelity.md
---

# A rail or fan-out a respine ADDS on a column that survives has no fade, and would pop

## What is true today

`VA.respineX` (`apps/viewer/topology.js`, 2026-09-15) interpolates the drawn
column count, so a column a respine *adds* starts collapsed onto the leftmost
rail and unfolds out of the spine. That is why rails and links need no opacity
of their own: at `e = 0` every added column is coincident with the one the
outgoing frame drew, so nothing appears from nowhere.

A rail or link on a column **both** serialisations have is a different case. It
is drawn at full opacity from the first frame whatever the transition is doing,
because a rail belongs to a *column* and a link to a *pair* of columns — neither
is in the store's keyed `alpha` map (`VA.tweenPositions`) and neither can be,
which is the same fact the x tween is built around.

## Why it is not observable today

The only two serialisations the page has are a topology's whole walk and one
study's chain. A chain is linear: **one** column, **no** links at all. So every
link a respine adds arrives on a column the respine also adds, and the unfold
covers it. Checked against every committed topology: all 22 study chains
across the five topologies have `columns: 1` and `links: []`, while their walks
run 2-10 columns and 2-18 links.

It becomes real the day two serialisations differ by something other than column
count — a loop closure present in one and not the other on shared columns, which
is exactly what
`ISSUE_20260915_respine_shows_the_chain_rather_than_recolumning_the_whole_walk.md`
(and `BRIEF_20260915_respine_scope_and_grid_motion` item 1) would introduce: a
re-columned walk keeps every row, so the two sides would share their columns and
differ in their links.

## What would close it

Either give a link an identity the two frames can be paired on — its two
`(row, to_row)` endpoints are element-keyed, so `VA.tweenAlpha` could answer for
it the way it does for a mark — or record in `apps/viewer/README.md` that a
link's opacity is deliberately positional and why. The first is the smaller
change and is already half-built: `railGeometry`'s link objects carry `row`/
`toRow`, and the layout rows those index carry `id`/`kind`.

Do not sequence this before the brief above: if a respine becomes a
re-columning, the surviving-link set changes completely.
