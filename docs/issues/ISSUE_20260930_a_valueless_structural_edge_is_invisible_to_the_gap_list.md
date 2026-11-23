---
type: feature
priority: med
status: deferred
area: topology-projection
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260930_vpa_pitch_linkage_topology_and_feature_fits.md
class: unsurfaced_or_buried_signal
defer_until: 2026-11-29
needs: agent
resolution: woke 2026-10-15 -- date trigger passed; re-triage; re-deferred 2026-10-15 (triage) -- med beyond BUDGET=3; below the brief bar (one vocab word, single repo) -- stage tactically when budget allows -- woke 2026-10-29 -- date trigger passed; re-triage -- triage 2026-10-29: med beyond the budget (3 staged), deferred again 14 days to 2026-11-12 | woke 2026-11-15 -- date trigger passed; re-triage | re-deferred 2026-11-15 (triage) -- med beyond budget (tolstack's 3 went to two highs and the fits.json rail)
---

# A structural edge with no dimension at all is invisible to the DAG page's gap list

## What happens

`scripts/build_topology_projection.py`'s `topology_gaps()` skips any edge whose
`dimension` is `None`:

```python
if dimension is None:
    # A `derived` gap edge carries no value ON PURPOSE -- it is the
    # quantity a study computes. Reporting it as an unsourced dimension
    # would invert its meaning...
    continue
```

That reasoning is right for the case it was written for — a **`gap`**-kind edge
with no value is the residual an L1 study computes, and listing it as "missing a
value" would say the opposite of what it means. It is wrong for a
**`structural`** edge with no value, which is a dimension of a named part that
nobody has a number for: the single most reportable kind of gap this repo has.

## Why it showed up now

`docs/topologies/topology_vpa_pitch_linkage.json` (2026-09-30) is the first
topology authored for a system whose numbers have *not* been acquired.
Twenty-eight of its twenty-nine edges carry no dimension, each with a one-line
`note` naming what would close it. The alternative — an `untraced` dimension with `nominal: 0.0,
min: 0.0, max: 0.0` — would have put the gaps on the list at the price of
showing a reader `0.000` where no number exists, and a reader cannot tell a
placeholder zero from a measured one. That is the trade this repo exists to
refuse, so the document carries no dimensions and the gap list carries almost
nothing.

The gaps are not *invisible*: the DAG page renders each of those edges with
value source `derived`, which is the viewer's word for "carries no value". What
is missing is that they do not reach the **gap list**, which is the surface a
reader goes to for "what is missing here" — the exact argument
`TOPOLOGY_GAP_KINDS`' own comment makes for having a topology-level list at all
("a gap that is only reachable by selecting the one study whose check happens to
name it is a gap nobody finds").

## Why this is `audience: strategy` and was not fixed in place

The fix is a fifth word in `TOPOLOGY_GAP_KINDS`, something like
`no_value_recorded`, reported for a `structural` edge with no dimension and
**not** for a `gap`-kind one. That vocabulary is generated into
`apps/viewer/vocab.gen.js`, and the viewer renders it through
`VOCAB.table("GAP_KINDS", …)`, which **throws at load** for a word the table has
no entry for. So the change is: one tuple entry, one regeneration, and one new
branch of reader-facing copy in `apps/viewer/` — and `apps/viewer/**` was fenced
out of the handoff that found this, because two parallel viewer handoffs owned
it.

Worth deciding rather than just doing, because there is a real design question
underneath: is "this edge has no value" the same *kind* of gap as "this edge's
value has nothing behind it" (`unverified_value`), or is it a stronger one that
should sort above it? A studyless topology built to be bound is a new document
kind (`docs/DAG_TOPOLOGY.md`, "A topology with no studies is a document kind"),
and how its emptiness reads to a reviewer is the thing being designed.

## Repro

1. `venv-win/Scripts/python.exe scripts/build_topology_projection.py`
2. Open the viewer's DAG page on `vpa_pitch_linkage`.
3. The gap list shows one row — `pitch_link_length`, "no tolerance recorded",
   which is correct and is the *only* edge in the document carrying a value.
   The twenty-eight edges with no value at all are not on it.

## Addendum 2026-10-26 (the_kinematic_page_keeps_the_dag_and_says_each_contributor_once)

Two more surfaces of the same conflation, met on the kinematic study page:

- `value_source` is `"derived"` on **every** edge with no dimension
  (`build_topology_projection.py::value_source`), so the viewer cannot tell a
  "quantity a study computes" gap from a structural edge nobody has banded.
  The preview pane's chip reads "DERIVED — the quantity a study computes" on
  `pitch_plate_attach_height`, `pitch_arm_radius` and `tan_link_mount_height`
  — three kinematic contributors whose bands are borrowed from other edges.
- Partly addressed on that branch: `VA.needsAnnotation(confidence, edge)` now
  counts a valueless structural edge (no dimension, kind not `gap`), so the
  detail pane offers the annotator for it, and on a kinematic page the pane
  names the edge the band is borrowed from. The gap list and the row badges
  still read the confidence alone; that half is still this issue's.

## Addendum 2026-11-20 (walk: the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page)

On v2 the conflation now reads as a false all-clear. `vpa_end_stop_v2` has 104
edges and **none** carries a value (75 structural, 29 gap), yet the panel under
the grid says, always visible, "Nothing is recorded as missing for this
assembly." (`views/topology.js` `gapsPanel`, the `!groups.length` branch). The
same page's grid wears 75 drawing-status chips on those open dimensions
(`an_open_dimension_says_where_its_drawing_stands`), so the two surfaces
disagree two inches apart. Shot:
`docs/sessions/lessons/shots/the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page/11_grid_bodies_off.png`
(bottom line). The sentence is also a negation on the surface, which the
prose budget rules out on its own.

## Addendum 2026-11-23 — seen on v2's study rows (walk the_walk_reads_the_v2_study_and_the_map_on_the_merged_page)

The study's gap rows open to a preview that contradicts itself. Opening
`pitch_link_lower_outer_race_od_to_centre` (MS14101-3's outer cylinder to
its ball centre, an open spec-sheet dimension) shows the chip
"DERIVED — the quantity a study computes" and "A study computes it from the
dimensions on either side". Its own note, two lines below, reads "Open.
MS14101-3's sheet gives the outside diameter D … and states no offset … so
no band is cited". The pitch arm's `pitch_arm_radius` reads the same chip.
Shots: `docs/sessions/lessons/shots/the_walk_reads_the_v2_study_and_the_map_on_the_merged_page/14_gap_card_outer_race.png`,
`15_open_untraced_pitch_arm_row.png`. Of v2's 105 edges, 81 carry no value.
By this issue's own finding (`value_source` is `derived` on every edge with no
dimension), each of them would read this chip. The walk opened only these two.
