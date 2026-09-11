---
type: feature
priority: med
status: open
area: apps/viewer
reporter: agent
audience: strategy
---

# Second-side crops: the edge hover card renders a LIST, but the crop index only ever holds one side

The `viewer_hover_cards_and_deep_links` brief: *"an interface's two half-sides
are usually different parts/drawings BY DEFINITION, so an edge hover should
eventually show BOTH sides' crops — ship both where both exist, one where one
exists, nothing invented where none."*

The card side of that landed: `VA.edgeCard`'s `crops` field is a list, and
`views/cards.js` renders every entry in it, so the viewer needs **no shape
change** when a second side arrives. But no second side can arrive from
today's data: `crops.json` records **one crop per citation**, and an edge
carries **one** citation (its own dimension's `source_ref`). The mating part's
own callout for the same interface is a *different* citation on a *different*
drawing, and nothing in the schema authors it — neither the stack element nor
the topology edge has a "the other side's source_ref" slot, and the nodes'
`source_ref`s (which do exist, per interface) are never cropped by
`build_viewer_crops.py`.

So "both sides" needs an upstream decision before it needs viewer work:

- **Where is the second side authored?** A second citation slot on an edge /
  stack element, or crops of the two NODE citations an edge spans (`from`/`to`
  interfaces already carry `source_ref`), or something else.
- Then `build_viewer_crops.py` grows a space (or entries) for it, and
  `VA.edgeCard` appends the second entry to the list it already renders.

Until then every edge card shows one crop where one exists — correct per the
brief ("one where one exists"), recorded here so the gap keeps an owner.
