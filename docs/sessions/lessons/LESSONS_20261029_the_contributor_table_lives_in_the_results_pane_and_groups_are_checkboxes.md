# Lessons — the contributor table lives in the results pane; groups are checkboxes

## What the shared re-render was coupling

The 10-28 plot handoff moved the results into `#detail` but left the contributor
table in `#kinematicview` under the DAG. The Unused control's handler called
`rewind()` -> `render()` -> `paint()`: the whole page. Nothing *toggled* the
table; the table was simply one more thing the wholesale `paint()` rebuilt, and
Jeff saw it come and go because the page repainted around it. (The `display`
flip in `paint()` is driven by `showKinematic`, not by the unlit style, so the
symptom Jeff saw was the full repaint plus the table being in a column nobody
looked at any more.)

Removed:
- `VA.renderKinematic` and the `#kinematicview` node (html, `paint()` display
  flip, `rewind()` scroll reset, CSS `.kmview`). The table is now built by
  `VA.renderKinematicResults`, under the stop readouts: one component, one
  container.
- Unused no longer calls `render()`. `paint()` leaves a `repaintDag(rewound)`
  closure that repaints the toolbar (label), the pane and the 3D scene's copy
  of the unlit word (`syncSceneModel`). Everything else the wholesale paint did
  on that path -- banner, nav, results, preview, worksheet, selection
  follow, seam handle -- depended on nothing the unlit style changes; the one
  thing worth checking was the 3D scene, which is why `syncSceneModel` is called.
  Not carried over: `landingPending` / Fit (never ran on this path before).

## Groups

`VA.GROUP_FILTERS` (four-word cycle) is gone; `VA.GROUP_KINDS` (bodies, chain,
kinematic) are the checkboxes, `tolstack.viewer.groupKinds` the per-topology
store (a list of the kinds switched OFF, so a new kind defaults on). The
checkbox repaints the pane only and leaves the toolbar alone so the popover
stays open. A test asserts every `studyGroups` kind is a `GROUP_KINDS` kind.
A group-kind default changed on purpose: with nothing lit the old default was
"bodies only", now all on -- identical on screen because no study group exists
without a lit study.

## Verification notes

- The worktree's browser run needs `node_modules`: a junction to the main
  checkout's (`mklink /J`, gitignored) plus `--repo C:/workspace/tolstack`.
- "crop lightbox" failed once in the full browser run (launcher focus, then an
  aborted suite) and passed 20/20 alone with `--only`; it is the viewer's
  index page, which this change does not touch -- load-sensitive.
