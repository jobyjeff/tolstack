# Lessons — a_context_filter_and_a_view_filter (2026-10-14)

## The vocabulary as shipped

- **Context** — "In this model" / "Other parts" (folded, with a count). The
  model is the selected topology's parts, or the study's; in sweep mode the
  run's bodies; plus what the reader added, minus what they removed. Verb:
  `context add|remove <part…>`, `context reset`.
- **View** — what is drawn: row checkbox, header checkbox (`show-all` /
  `hide-all`, tri-state), **Isolate** (`isolate off` is its undo) and `ghost`
  (`ghost off`, the same snapshot).
- The word "context" never appears on screen; "In this model" and "Other
  parts" are the reader's words. Words live in `AA.PARTS_COPY` so the ban-list
  scan reaches them.

## Decisions the handoff did not make

- **The snapshot is taken once per run of isolates.** Isolating a second part,
  or clicking Isolate on another row, adds to the isolated set and keeps the
  original snapshot, so `isolate off` always lands on the view from before the
  first one. The button is a toggle on set membership (`AA.planIsolateToggle`).
- **`show-all` / `hide-all` and a typed `trace`/`goto` isolate clear or take a
  snapshot respectively**: show-all/hide-all are a new explicit view, so they
  drop the snapshot; `trace`/`goto` call `isolate`/`ghost` and so are undoable
  with `isolate off`.
- **"Leaving a context" is `selectTopology` / `selectStudy`** (and either edge
  of sweep mode, which clears the edits and the snapshot but leaves what is
  drawn alone — leaving sweep restores its own snapshot). `filter-element`
  narrows the context but does not reset the view; resetting there would undo
  the isolate a `goto` runs right after it.
- **A studyless topology left the previous topology's study in
  `state.currentStudy`.** That was a latent bug — it would have made the
  context of a studyless topology the last study's parts — fixed in
  `selectTopology` (the study is now null).
- **No element selected is a banner, not a block.** A pick still selects the
  face (the bind form needs an element to appear); the banner says what to do.
  Picking-off-in-sweep already had its line (`AA.SWEEP_PICKING_DISABLED`).
  Jeff's "nothing happens when I click the spherical faces" may equally be a
  raycast miss on the real meshes; I could not reproduce that on the mock and
  did not chase it.
- **Mock fixture grew two parts and a studyless topology** so there is a model
  of three to filter and an empty study picker to see. The studyless topology
  is listed after `demo_system` so the default topology is unchanged.

## Gotchas

- The repo's files are **CRLF on disk** (`core.autocrlf=true`); a scripted
  edit that matches multi-line text must normalise first.
- `run_browser_check.mjs --shots <dir>` also rewrites the four sweep
  screenshots and their `.txt`; I reverted those so the diff carries only this
  handoff's three panel shots.

## Not done / filed

- Trace pulls in meshes a *binding* points at that the part list missed; those
  are drawn but sit in "Other parts" (not in the model). Left alone — a
  design question for whether the model includes bound meshes.
