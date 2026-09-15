---
type: bug
priority: med
status: open
area: viewer/topology
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260915_respine_tween_fidelity.md
---

# An interrupted respine pops rails in from nowhere — "nothing appears from nowhere" holds only from a settled frame

## The claim, and where it is written

`VA.respineX` (`apps/viewer/topology.js`, `respine_tween_fidelity` 2026-09-15)
interpolates the drawn column count, and three places justify rails and links
carrying no opacity of their own on the strength of that:

- `apps/viewer/views/topology.js`, `railsSvg`'s comment 1: *"a column the
  transition is adding is drawn collapsed onto the spine at e = 0 and unfolds
  out of it, so there is nothing to appear from nowhere"*;
- `apps/viewer/README.md`: *"A surviving rail starts exactly where the outgoing
  frame drew it"*;
- `ISSUE_20260915_a_rail_or_link_a_respine_adds_on_a_surviving_column_has_no_
  fade.md`, "Why it is not observable today": *"at `e = 0` every added column is
  coincident with the one the outgoing frame drew, so nothing appears from
  nowhere"* — which is what makes that issue `priority: low`.

All three are true when the outgoing frame is a **settled** one. They are false
when it is a transition frame, which is the case `VA.lastTopoRender.columns`
was deliberately made fractional to support.

## Measured

Synthetic 10-column walk, 1-column chain, `VA.RAIL_METRICS`, straight off the
shipped functions:

```
frame A (select walk -> chain, e = 0.5): rails [105]                      width 136
frame B (interrupt: deselect, e = 0):    rails [15,15,15,15,15,25,45,65,85,105]  width 136
```

Frame B is the first frame of a respine that starts from frame A's own record.
The spine stays at 105 and the width is continuous — which is exactly what the
new guard *"a respine interrupting a respine continues from the picture on
screen"* asserts (`apps/viewer/tests.js`, via `spineAndWidth` = max rail `x1`
plus the SVG width). Behind those two numbers, **nine rails appear at full
opacity at x = 15…85, where frame A drew nothing at all.** The added columns
collapse onto the *leftmost drawn* rail, not onto the spine, and from a
fractional outgoing frame those are not the same place.

Not a regression: the pre-2026-09-15 block slide popped the same rails in, and
further off-pane. But the fix's own reasoning is what is now overstated.

## Why the guard cannot see it

`spineAndWidth` reduces a frame of N drawn things to two scalars, and both of
them are the two quantities `VA.respineX` returns. A continuity check over a
picture has to pair the **drawn set** — every rail `x1`, not its maximum —
against the caught frame's.

## What would close it

1. widen the interrupt guard to pair the whole rail/mark set of the
   interrupting frame's `e = 0` against the caught frame's, and accept that it
   will then fail;
2. then either fade a rail whose drawn column index was not drawn by the
   previous frame (the store's `alpha` map cannot answer for a rail, but
   `respineX` knows `from.columns`, which is enough), or re-word all three
   sites above to say the claim holds from a settled frame only.

Sequence with `ISSUE_20260915_a_rail_or_link_a_respine_adds_on_a_surviving_
column_has_no_fade.md` — same mechanism, same fix shape — and re-check that
issue's `low` priority, which rests on the claim this one falsifies.
