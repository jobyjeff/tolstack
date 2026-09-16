---
type: chore
priority: low
status: triaged
area: viewer/docs
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_respine_whole_walk.md
handoff: docs/sessions/HANDOFF_20260916_doc_facts_and_projection_stamps.md
---

# `apps/viewer/README.md`'s "two studies dropped rows, the third covered nearly everything" is not a state the pre-change page could be in

`viewer_respine_whole_walk` shipped the right behaviour and Jeff decided it
independently (brief item 1). What does not reproduce is the **reason** the
README now gives for it. The added paragraph under "Studies" reads:

> And the report was about **inconsistency** as much as about hiding: two of
> `pitch_link_to_pitch_plate`'s studies dropped rows while the third's chain
> covered nearly everything, so the same control read as three different
> behaviours.

That restates the handoff's item 3 (*"thread-region-T's chain covers ~every
visible element (nothing visibly faded) while the other two studies dropped
rows"*), which is itself a reconstruction of Jeff's note — a note that ends
*"Actually I'm not sure what's going on here."*

## Measured

Pre-change tree = `integration` @ `2dbd3d7` (the handoff's own branch base),
extracted with `git archive` and probed through the fast `[real]` tier against
the rebuilt live projection. Counts are dots / bars / rails / links / dimmed
bars / leaders / grid rows / dimmed rows.

```
walk, no study selected              7/8/3/4/0/5/8/0

cotter_hole_clearance  topology-mode 7/8/3/4/3/5/8/3
cotter_hole_clearance  chain-mode    6/5/1/0/0/4/5/0
shank_out              topology-mode 7/8/3/4/4/5/8/4
shank_out              chain-mode    5/4/1/0/0/5/4/0
thread_region_t        topology-mode 7/8/3/4/6/5/8/6
thread_region_t        chain-mode    3/2/1/0/0/2/2/0
```

The page had exactly two reachable states, and neither matches the sentence:

- **chain mode** (what a nav click gave, since `viewer_study_respine_animation`):
  **all three** studies dropped rows — 8 → 5, 8 → 4, 8 → 2 — and **nothing was
  faded at all**, in any of them. `thread_region_t` dropped the most, not the
  least.
- **topology mode** (what a `?study=` deep link gave, because the deep-link path
  never set `layoutMode` — this handoff's lesson records that divergence):
  **no** study dropped a row, all three faded, and `thread_region_t` faded
  **6 of 8**, again the most.

So "the third's chain covered nearly everything" is false of `thread_region_t`
(2 of 8 edges, the smallest of the three chains), and there is no state in which
two studies dropped rows and a third did not.

## Why it is worth fixing rather than leaving

The sentence is now the shipped justification for retiring a control, sitting
beside Jeff's verbatim quote, which makes it read as measured rather than
reconstructed. The quote alone carries the decision; the reconstruction adds a
falsifiable claim the decision does not need.

## Suggested fix

Keep Jeff's words and the decision; drop or hedge the causal reconstruction —
e.g. *"the report also read the three studies as behaving differently from one
another"*, without asserting which one covered what. If a measured version is
wanted, the honest one is above: under the old nav click every study dropped
rows and none dimmed anything, so the page gave no signal at all about what a
study excluded — which is a stronger argument for the change than the one
currently written.
