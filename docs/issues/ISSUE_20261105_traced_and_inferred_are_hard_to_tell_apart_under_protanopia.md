---
type: chore
priority: low
status: deferred
area: design/palette
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261105_the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste.md
defer_until: 2026-12-06
class: reading_surface_copy
resolution: deferred 2026-11-06 (triage) -- low defers by default; 30 days
---

# Traced green and inferred amber are hard to tell apart under protanopia

The handoff asked for the overlay ramps to be checked with the dataviz
validator. The DAG's new "sourcing" overlay reuses the app's provenance
palette as it is (`apps/viewer/style.css` `:root`: `--traced #43a047`,
`--inferred #d98a00`, `--untraced #e05252`). Run as a categorical set on the
page's `--bg` (`#16181d`):

- **CVD separation fails:** traced against inferred is ΔE 3.0 (protan). The
  target is 8, and 6 to 8 is allowed only with a second encoding.
- **Normal-vision floor fails:** untraced against inferred is ΔE 14.8. The
  floor is 15.
- Contrast passes: every hue is at least 3:1.

The grid's chips are safe, because the chip carries the word (`traced`,
`UNTRACED`) and untraced is filled. The DAG overlay has no word on the mark.
Its legend names each colour, and nothing else separates them there.

Not changed in this handoff: the provenance palette is the app's subject
(`docs/DESIGN_TYPE_AND_COLOUR.md`, "Colour"), and re-stepping it touches
every surface that uses it.

Options, for a strategy session:

1. Re-step `--inferred` towards yellow (lighter, around L 0.78) so that it
   separates from green on lightness, then re-validate.
2. Keep the palette and give the sourcing overlay a second channel on the
   bar, for example a dash for inferred.
3. Accept it, since the overlay is opt-in and the grid stays the source of
   truth.

Recommendation: option 1. It improves every surface at once and is one token.
