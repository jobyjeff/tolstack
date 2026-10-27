---
type: bug
priority: med
status: open
area: tests/browser
reporter: agent
class: timing_flake
found_by: docs/sessions/active/HANDOFF_20261026_pitch_system_folds_into_the_pitch_linkage_model.md
---

# Respine and re-fit browser checks miss their frame when the box is loaded

`scripts/run_viewer_browser_tests.mjs` was run four times on 2026-10-26 against
one unchanged projection, built from the committed tree of this branch. The
suites `topology file:// respine` and `topology height budget` came back
40/40, 39/40, 34/38 and 38/40 (respine) and 21/21, 20/21 (height budget). Then,
run back to back with `--only`, the very next pass was 40/40 and 21/21. The
failing sub-checks change between runs. All of them catch an animation frame
in flight (`catchFrame()`: "deselecting a study animates too", "and so does
DEselecting", "the incoming walk is drawn inside the pane in the grow
direction", "a respine carries the reader's sideways scroll onto the FIRST
frame"). One is `[mock]` ("shrinking the window re-fits the DAG into it"), which
reads no live projection at all.

So these are wall-clock races, not regressions. They got likelier once the
product graph made the live DAG about 106 rows, since a paint takes longer
and the frame window is the same. The failing runs overlapped other agents'
suites on the shared box. A batch merge or review that reads one red as a
regression wastes a session; one that learns to ignore it misses the real
one.

Fix shape: wait on an event the animator emits (a frame counter or a
`data-respine` attribute set for the transition's duration), not a sampled
frame. Or make the transition duration a test knob so the window can be wide.
The standing rule rules out generating load to reproduce this; the knob is the
way.

## Addendum 2026-10-26 (rework after review) -- the respine half was this branch's, and is fixed

The review corrected the reading above. On the folded graph the respine suite was red in 4 of
4 runs, and on `integration` it was 40/40 twice, at 16% CPU. So the respine half was a regression
the fold caused, not a load race: a 106-row paint leaves the 260 ms transition too little
room. The suite now widens the page's own knob for itself (`VA.RESPINE.duration = 1200`,
`RESPINE_SUITE_DURATION_MS` in `scripts/run_viewer_browser_tests.mjs`). Re-measured on the
rework tree (`b76462d`): 5 of 5 `--only` runs at 40/40, then the full tier with 28 of 28
suites green.

**What is left open:** the `[mock]` re-fit check ("shrinking the window re-fits the DAG
into it", `topology height budget`). It failed once in this session (20/21) and passed on its
next run and in the full run above. It reads no live projection, so the fold cannot reach it.
The event-or-knob fix shape above still applies to it.
