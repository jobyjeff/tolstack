---
type: feature
priority: low
status: deferred
area: viewer/leaders across the seam
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261026_leaders_follow_the_active_study_across_the_seam.md
class: seam_leader_coverage
defer_until: 2026-11-26
resolution: deferred 2026-10-27 (triage) -- low by default
---

# Leaders across the seam cross each other where dot order and anchor order disagree

The handoff asked that "where the lit set's anchors cluster, leaders fan from a
shared ordinate". What shipped is one bend per leader: level out of the dot to
a shared abscissa half a gutter left of the DAG, then straight to the anchor
(`VA.seamLeaderGeometry`). Because the leg out of the DAG is level with the
node's own row, no leader can run through a lit bar (pinned at zero by the
tiers). But the angled legs cross whenever the order of the dots down the DAG
differs from the order of the anchors in the scene, and nothing reorders them.

Measured on P2's kinematic study at 1600×1000 (`VA.seamCrossings`, pairs):

| state | leaders | crossing pairs |
|---|---:|---:|
| dimmed, at rest | 3 | 0 |
| hidden | 9 | 5 |

> **Correction, 2026-10-27.** The hidden row was one scroll state's reading.
> Read with the page and the DAG box both at their top (the browser check's
> pinned state, the same on two runs), the hidden state draws **9 leaders
> with 15 crossing pairs**. The pitch plate's and the tangential link's
> rungs are in view together there, and their anchors interleave in the
> scene.

Two smaller things in the same picture (`docs/sessions/shots_20261026_leaders_across_the_seam/`):

- The angled leg runs over the annotator's own readout and bars above its
  canvas on its way to an anchor low in the scene.
- Anchors on one body (a ladder of rungs) sit within a few pixels of each
  other, so their leaders arrive as one bundle.

## Options

- (a) **A second bend at the seam**: each leader turns at the scene's edge onto
  an ordinate assigned in anchor order, then runs level to its anchor. Removes
  the crossings in the angled legs (they become a monotone fan) at the cost of
  the one-bend rule.
- (b) **A shared ordinate per cluster**: anchors within a few pixels share one
  bend point, then fan out. Reads a ladder as one bundle on purpose.
- (c) **Clip the overlay to the canvas's rect** inside the frame, so a leader
  never draws over the scene's chrome (needs the canvas offset, which the
  anchors message already folds in but does not report).

Recommendation: decide with (a) and (c) together on a screenshot; (b) only if
Jeff reads the bundles as noise.
