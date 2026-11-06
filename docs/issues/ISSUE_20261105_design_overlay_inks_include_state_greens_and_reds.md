---
type: chore
priority: low
status: open
area: design
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261105_the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste.md
---

# Design: the colour-overlay inks include greens and reds the provenance palette uses for state

The DAG's new colour overlays (`apps/viewer/topology.css` `:root`) put
saturated greens and reds on marks that carry no state:

- `--ovl-if-*` (interface type) is commented "minus its green and red so no
  slot reads as a provenance colour", but `--ovl-if-2` is `#199e70`, a green,
  and `--ovl-if-1` is `#d95926`, an orange-red.
- `--tv-body-ink-*` (the body and part overlays, a part's solid fill and the
  3D body colour) are the 16 body hues at stroke strength, and that includes
  greens (`#41a87e`, `#71a342`, `#509659`) and reds (`#b6522d`, `#ba417b`).
  The old `--tv-body-*` tints were kept low-chroma so that none could be read
  as a provenance hue. At ink strength that no longer holds.

Only one overlay is drawn at a time, so a reader never sees "body" and
"sourcing" together. The risk is a green bar under "Body" being read as
"traced", which is the meaning the grid's chip gives that green. This is a
judgement call (the tactical prompt's "red/amber/green for state only"), not a
defect: filed so the next palette pass weighs it. A fix starts with the
comment on `--ovl-if-*`, which states something its values do not do.
