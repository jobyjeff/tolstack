---
type: bug
priority: low
status: triaged
area: viewer/topology
reporter: agent
handoff: docs/sessions/HANDOFF_20260915_respine_tween_fidelity.md
---

# Deselecting a study slides the DAG in from off the pane's left edge

## What happens

A respine (`viewer_study_respine_animation`) interpolates the keyed position
store in **y only**. x cannot go through the store: a mark's x is
`VA.railX(row.column)`, a **rail is not a keyed row**, and interpolating each
mark's x while its rail stayed on the target layout's column would draw dots
floating beside the lines they sit on. So the horizontal change is absorbed as
one whole-block CSS translate (`VA.respineShift`), right-anchored on the
outgoing frame's grid seam.

Selecting a study is the shrink direction and reads correctly: the shift starts
positive, the spine stays where it was, and the block settles left.

**Deselecting is the grow direction and the shift starts negative** — on the
real `pitch_system`, `translateX(-234px)` — so at the first frame the incoming
walk's nine branch rails are laid out left of the pane's own left edge and
`.tv__hscroll`'s `overflow-x` clips them. They slide into view as the shift
decays. Everything clipped is *entering* content (alpha 0 at that frame, since
it is not in the outgoing serialisation), so it is faint rather than missing,
and by the midpoint most of it is on screen.

## Repro

1. `node scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack`
   passes — this is cosmetic and nothing asserts against it.
2. By hand: serve `apps/viewer/topology.html`, pick **Propeller pitch system
   blade-pitch position**, pick any of its studies, then click the topology row
   again to deselect. The graph unfolds from behind the pane's left edge over
   ~260ms.

Measured at the frame level by pinning `VA.respineEase` to a constant: at
e = 0.25 the body carries `translateX(-175.5px)`, at e = 0.6 `-93.6px`, at
e = 1 nothing.

## Why it was left

Three ways out, all bigger than the defect:

- **Clamp the shift to ≥ 0.** Then the grow direction does not slide at all and
  the spine jumps 234px sideways at the click — a visible snap in the exact
  direction pair the feature is about, and asymmetric with the shrink
  direction.
- **Put x in the store per element.** Rails and fan-out/close links have no
  element key to pair on (a rail belongs to a *column*), so they would have to
  cross-fade while the marks slid — dots detaching from their rails mid-flight,
  which is worse than a clip.
- **Make the two serialisations the same width**, which is
  `ISSUE_20260915_respine_shows_the_chain_rather_than_recolumning_the_whole_walk.md`:
  if a study re-spine re-columned the walk instead of replacing it, both sides
  would have the same column count, `VA.respineShift` would be zero, and this
  disappears rather than being fixed. That is the real answer and it is a
  strategy question.

A fourth, cheap and narrow: give `.tv__hscroll` enough left padding during a
transition to hold `max(0, -shift)` and remove it on settle. Untried — it
moves the sticky rail's own left edge, which is a landed contract
(`.tv__rails { position: sticky; left: 0 }`), so it needs its own measurement
rather than a guess.
