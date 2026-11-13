# Lessons — a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown (2026-11-12)

## The refresh mechanism chosen, and what a write costs

**The pages read the log now, not the fold.** I did not use the suggested
"give the viewer's http adapter the served `bindings.json`", because no
drawing-checker mount serves `projections/feature-identity/`. `/tolstack/data/`
is `projections/viewer/` and nothing else (`webui/analyses.py`'s
`tolstack_mounts`), and the handoff fences drawing-checker off. So:

- `feature_identity.main()` (rebuild step 5) also writes the **served log**,
  `data/projections/viewer/feature-identity/log.json`: every event verbatim in
  log order, plus the installed meshes' sha256. It is a copy of inputs, so it
  goes through no provenance gate.
- Both pages fold it in the browser (`apps/viewer/identity_fold.js`, one file
  for both apps). `tests/test_identity_fold_is_paired.py` runs node from
  pytest and compares the JS fold with `build_projection` record for record,
  including restated accepts, seq collisions, corrections and unbinds.
- After **every** event, the pane re-reads the inbox through its grant,
  rewrites the served log through the same grant, repaints its bound faces and
  posts `annotate:identity` (its merged record) to the shell. A reload with no
  grant then reads the rewritten copy.
- **Not chosen:** the full rebuild route. The 11-11 rebuild ran 21:05:58 to
  21:12:44 by projection mtimes, about 6 m 46 s, mostly contact suggestions.
  Filed `ISSUE_20261112_bindings_json_waits_for_a_full_rebuild_and_the_mount_has_no_narrow_refold.md`
  for a narrow refold route. `bindings.json` (the fitter's input) still lags
  the log until the next rebuild, and nothing a person looks at reads it now.
- **Measured time per write:** see "The DoD run" below
  (`window.__lastServedLogMs`, the re-read plus the rewrite).

## Things that cost time

- **The annotate page has no `VA.CONFIG`.** It loads the viewer's
  `storage/http.js` but not the viewer's `config.js`. A viewer-adapter method
  that reads `VA.CONFIG` therefore works in the viewer and throws in the pane
  ("load failed: Cannot read properties of undefined (reading 'identityLog')").
  The first probe run caught it; the fast tier had not. The pane now reads the
  log through `servedRelative(AA.CONFIG.servedIdentityLog)`, like every other
  read set file, and the http check in `apps/annotate/run_tests.cjs` reads it
  there. Rule: in `apps/annotate/storage/http.js`, call only the viewer
  adapter's path-taking readers (`readDataJson`, `readMeshJson`).
- **`window.__sweep.armed` is read by ~20 browser checks and 4 witness
  anchors.** The armed pick moved to `state.armed` (it now works with no
  sweep). Renaming every site broke those anchors. Fix: `state.sweep.armed` is
  an accessor onto `state.armed` (`Object.defineProperty` at sweep creation),
  and the four anchored lines are back verbatim. Before renaming a state field
  in `app.js`, grep `scripts/run_viewer_browser_tests.mjs` and
  `scripts/mutation_witnesses/` for it.
- **Five witness anchors moved with the code**: the fold left
  `binding_state.js`, the per-part status rewrote `model.js`'s
  `featureStatus`, and the arm's pose block was re-indented. I found them with
  a ten-line script that checks each spec's `find` against its file. That is
  faster than waiting for the `--changed-since` gate to say `anchor gone`.
- **Heredocs through the Bash tool** broke twice on edit scripts that
  contained both quote kinds; the memory note is right. Write the script with
  the Write tool.

## Decisions not in the handoff

- **Flip is offered only on a dimension edge whose other end has no face.** A
  flip on a gap edge would move the face onto the other part, which is never
  right, and a flip into an occupied end stacks two faces.
- **Unbind retracts every standing binding at that end** (normally one). A
  retraction may not name a binding already superseded or retracted. A
  binding taken back may not be superseded afterwards; a new pick binds afresh.
- **Suggested with no pane rows** (the run does not carry the feature) shows
  `suggested · <surest confidence>` and Pick a face, armed at the proposal's
  end. A click answers the proposal through `AA.planAnswer`, as on the rail.
- **Bound faces** sits in the top bar's Display group (the top bar's
  collapsible half), in both modes, on by default, stored like the other
  display settings.
- **Orphans**: the mesh test uses the installed-mesh list the served log
  carries (or the pane's mesh list). With no list, no mesh is judged.

## What the re-keying handoff (a feature bound once, to a set of faces) finds

Already done:
- One JS fold for both apps (`identity_fold.js`), paired with Python. A new
  record shape changes in two places, and the pairing test fails until both
  agree.
- The model already answers per feature: `model.endsOf(fid)`,
  `model.bindingsOf(fid)`, `model.proposalsOf(fid)`, on the feature's own
  part. The tree's status, body, hover and actions all read these, not edges.
- Unbind (`retracted`) and correction (`supersedes`) are verdicts on the log.
  The body's verbs (`arm`, `unbind`, `flip`) name an edge end, and only
  `VA.featureBodyPlan` builds them.

Still to migrate:
- **Every event is still keyed by edge end** (`stack_key` = topology edge,
  `direction`). A feature-keyed stream needs a new stack-key kind (or event
  schema) and a one-time migration of the log. Do not rewrite the files:
  write new feature-keyed events that `supersedes`/`retracts` the edge-keyed
  ones. Both folds and the pairing test change together.
- `featureBodyPlan` picks "the feature's first own edge end" for a feature
  with nothing bound. That choice disappears with feature keys.
- The pane's rail rows are still keyed by edge end (`sweepRowsForFeature`, the
  `#element-list` rows). The tree uses them only for a suggestion now.

## The DoD run

**8000 was not serving** during this session (`curl` to
`/tolstack/viewer/topology.html` answered nothing), and 8843 serves `apps/`
alone, with no data, so it cannot show bindings. I ran instead on
`tests/debug_binding_corrected_where_shown_20261112.mjs`, which reproduces
drawing-checker's mounts (`webui/analyses.py`'s `tolstack_mounts`) on a
private port. It serves this tree's apps and the main checkout's meshes.
`/tolstack/data/` is a **scratch copy** of the viewer projections and of the
log (`data/scratch/binding_demo_20261112/`, deleted after the run). The
pane's folder grant went through its real `storage/fsa.js` path, handed a
directory handle that the probe's server backs with the scratch folder.
**Not demonstrated:** the real drawing-checker process on 8000, and a real
File System Access grant to the real folder. Nothing was written to
`data/inbox/feature-identity/`.

Read-only, on the scratch copy before any write (shots `01`-`03`):
- The hub shows `tangential link mount base face` **bound** ("bound · face
  526 of 214373-002", with Correct, Unbind, Flip). The mount's own feature on
  the same node is **not bound**. It reads `suggested · high`, because an open
  proposal sits on its side, and its body is the pane's candidate rows.
- **Twisty walk over v2:** 34 features, 34 with a twisty, **0** opening to
  nothing.
- The pane's bound marks came from the record: 11 faces green on load.
- **Orphan line:** absent. No standing binding in the real log names a gone
  edge or an uninstalled mesh. So none sits on an edge that left with
  `gas_spring_mount_hub_face` on 2026-11-10; the line would have named it.

Scratch flow on `hub@tan_link_mount_fastener_clocking`, which had nothing
bound and nothing suggested (shots `04`-`10`):
- Pick a face armed the pick on the hub (shot 04: the body reads "picking on
  214373-002 propeller hub" with Cancel; the hub solid, the rest faint). A
  click on face 1029 bound it: body "bound · face 1029 of 214373-002",
  scratch inbox 78 to 79 events, served log 79, green marks 11 to 12.
- **Reload, pane closed:** the tree marks it bound. That read has no grant,
  so the served log carried it. Hovering the bound line washed face 1029 in
  the scene.
- **Correct:** a click on the same face was refused ("already bound to face
  1029"). A click on face 1054 superseded it (80 events). Still 1054 after a
  reload.
- **Unbind:** body "not bound" with Pick a face (81 events, one
  `retracted`), green marks 12 to 11, still unbound after a reload.
- **Time per write** (`window.__lastServedLogMs`, re-reading the inbox and
  rewriting the served log): **8.1 to 8.8 s through the probe's HTTP-backed
  handle**, which makes about 160 sequential fetches for 80 events. Click to
  body was about 22 s on the first write of a page, which also asks for the
  folder and lists the inbox for the next seq. A real File System Access
  handle on local disk does the same reads without a round trip each; I could
  not measure that here. If it is slow on Jeff's machine, the narrow refold
  route (filed issue) or an incremental rewrite (append the one event to the
  served copy) are the two cheap fixes.

## Found along the way

- **The page must never take a poorer record from the pane.** In the browser
  tier the pane can run on fixture data. Its first identity post replaced the
  page's real record, and every bound feature read "not bound". The page now
  takes the pane's record only when the record folds every event the page's
  own does (`VA.paneIdentityWins`), and repaints only when it adds one.
- **Four 11-10 browser guards pinned the old body.** Under a bound feature
  they asserted the pane's rows, an element row click and the bind bar. I
  swapped them for four guards on the new contract, deleted the old specs and
  wrote new ones, and re-pinned the name set.
- "resting on a body row in the nav lights that body in the scene" failed in
  2 of 4 runs of its suite on this branch. Its own comment documents a rebuild
  race. After the no-repaint-on-same-record change it passed (see the
  completion report for the final runs).
