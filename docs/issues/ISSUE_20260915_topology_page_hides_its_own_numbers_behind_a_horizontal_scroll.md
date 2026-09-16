---
type: bug
priority: med
status: open
area: viewer/topology
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260915_viewer_study_verdicts_and_gaps.md
---

# The DAG page's folded totals and its sourcing column are both off-screen at 1600px

Measured 2026-09-15 on the real projection, Chrome at a 1600×1000 viewport
(the browser tier's own size), served from a repo-root static server.

Two blocks on `apps/viewer/topology.html` are reachable **only by dragging a
horizontal scrollbar**, and neither announces that it is there:

1. **The study totals strip** (`.tvtotals__strip`) is `flex-wrap: nowrap;
   overflow-x: auto`. That was a deliberate decision — the strip's height must
   not grow with a study's `notes` or with window width (viewer_v2_single_nav,
   deliverable 2) — but on a ~870px pane (nav + DAG + detail aside at 1600px)
   the study's title, id and `from → to` span consume the whole width before
   the first folded number. So **nominal, worst case, worst-case half, RSS and
   RSS half are all past the right edge** on `pitch_link_shank_out` and on
   every `pitch_system` study. The numbers this page exists to publish are the
   ones a reader cannot see.
2. **The grid's `sourcing` and `crop` columns.** The row table is 1218px wide
   against a grid pane of roughly 640px once the rails are drawn, so the
   confidence chip, the attention badges and the crop thumbnail are all off the
   right edge in the default layout.

Both predate `viewer_study_verdicts_and_gaps` — nothing in that handoff changed
the strip's overflow rule or the pane's width — but it made each slightly
worse and is why they were noticed: the strip gained one verdict chip at its
left edge, and the `sourcing` column widened from 200px to 260px so a badged
row would stop clipping its own citation chip inside the cell.

**Why `audience: strategy`:** the fix is a layout decision, not a bug fix, and
the options trade against each other. Wrapping the strip reverses a recorded
decision about its height. Collapsing the detail aside when nothing is selected
frees ~430px and changes what "arriving at the page" looks like. Dropping the
`from → to` span to a hover shortens the strip but removes a statement of what
the study spans. Choosing between those is the strategy call; a tactical
handoff can then land it.

**Repro:** serve the repo root, open `apps/viewer/topology.html`, pick
*Shank out* under *Pitch link to pitch plate*, and look for the worst-case
numbers in the strip at the bottom. They are there; they are 300px to the
right.
