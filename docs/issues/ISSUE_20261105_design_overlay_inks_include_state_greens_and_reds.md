---
type: chore
priority: med
status: deferred
area: design
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261105_the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste.md
defer_until: 2026-12-06
class: reading_surface_copy
resolution: deferred 2026-11-06 (triage) -- low defers by default; 30 days
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

## Addendum 2026-11-09 (review of `the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows`)

The mitigating argument above ("only one overlay is drawn at a time, so a reader
never sees 'body' and 'sourcing' together") stopped holding on 2026-11-08: that
handoff made `Colour by: Body` the **default** and inks every body container,
part container, grid bracket, bracket label and (faintly) grid row in
`--tv-body-ink-*`, always beside the grid's provenance chips. The default Bold
palette, which Jeff asked for (plotly-class), is now `#00cc96` (green),
`#fecb52`/`#ffa15a` (amber/orange), `#ef553b` (red) and `#ff97ff`/`#ff6692`
(magenta/pink) in its first ten slots; the Colour-blind set adds `#009e73` and
`#d55e00`. v2's five bodies wear slots 0-4, so `#00cc96` green is the
tangential link on the demo page.

`apps/viewer/README.md` still says, under "The colours", that green, amber, red
and magenta "are **provenance** on this surface and nothing else may wear
them", and "Reading the colours" says "Provenance is the only saturated colour
on the page". Both are now false by default. This is a design decision Jeff
made knowingly in the handoff, so the question for the next palette pass is
which way to settle it: drop the four state families from the body palettes
(as the 2026-09 bands argued), or rewrite those two README sentences to say the
body inks are the deliberate exception and the chip is the only state carrier.
