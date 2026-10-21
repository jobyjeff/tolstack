# LESSONS 2026-10-20 — the_3d_pane_opens_in_the_mode_the_study_wants

The viewer's 3D flyout is a pane now. It stays open across the page's
navigation, follows the selection into sweep or bind mode, passes hover over
to the annotator, and its head line is the annotator's own answer. What
follows is what the diff does not say.

## The message vocabulary, both ways

Same-origin only in both directions. Anything from another origin, or from a
window other than the pane's own iframe, is ignored.

| direction | message | sent when |
|---|---|---|
| viewer → annotator | `{type: "annotate:exec", command}` (unchanged) | the selection changes while the pane is open (`followSelection`, after every paint), a row's 3D control, the kinematic model row |
| viewer → annotator | `annotate:exec` with `["highlight", <topology>, <edge>]` / `["highlight", "clear"]` | the pointer settles on, or off, an edge's grid row, rail mark or kinematic contributor row |
| annotator → viewer | `{type: "annotate:result", id, ok, result\|error}` (unchanged) | every exec. The viewer still ignores it |
| annotator → viewer | `{type: "annotate:state", mode, topology, study, run, title}` (new) | after `sweep`, `goto` or `trace` completes, whoever ran it: the viewer, the run picker or the command box |

- `mode` is `sweep` or `bind`. `title` is the full head line, built on the
  annotator side by `AA.embedState`, with mode words from
  `AA.EMBED_MODE_WORDS`. The viewer prints it verbatim, so no viewer code
  composes it. The sweep subject is the run's mechanism in words, the same
  name the sweep bar uses ("Sweep — vpa pitch chunk2 p2"). The bind subject
  is the study's title, or the topology's when no study is selected.
- The three verbs post through `announced(fn)` at registration. **A future
  verb that changes the mode or the subject must be wrapped the same way**,
  or the pane's head will go stale.
- When the viewer re-drives the pane, it resets the head line to its resting
  words ("3D") until the reply arrives. So a command that fails, or an
  arrival the reader's auto-setup turned off, never leaves the old subject
  showing.

## The debounce figure

`VA.PANE_HOVER_DEBOUNCE_MS = 150`, trailing. A pointer sweeping down a table
posts nothing until it settles, so the iframe gets at most about 6.7 messages
a second. A target is never posted twice in a row. The fast tier keeps the
value between 100 and 500 ms, and a mutation spec sets it to 0.

## Decisions the handoff left open

- **The nav rail stays visible while the pane is open.** It stood down until
  now, on Jeff's "you shouldn't need both at the same time". The definition of
  done selects chain studies *in the nav* while the pane is open, so that
  rule had to go. The order is pane | nav | DAG: the pane keeps its left dock
  and the rail moves over with the page. The cost is a narrow DAG on a chain
  study page (about 170px at 1600 wide), filed with options as
  `ISSUE_20261020_with_the_3d_pane_open_a_chain_study_page_leaves_the_dag_a_narrow_strip.md`
  (`audience: strategy`). `roomBesideFlyout` now subtracts the rail's width.
- **The remembered width is a preference that each page fits.** The first
  TRUTH run caught this. At boot the stored width was clamped against the
  first layout, before the kinematic page had loaded, so a 700px choice came
  back as the 560px floor of a page the reader was not on. Now the reader's
  choice (`flyoutWanted`) is kept with only its own min and max applied, and
  `refitPane` clamps it to each page when the selection moves. A width the
  layout forces is still never written back.
- **`goto` and `trace` leave sweep mode on the annotator side** (`leaveSweep()`
  at their top, which does nothing outside sweep mode). So the viewer posts
  the plain goto and needs no `sweep off` command of its own. The handoff
  called this "the annotator's leaveSweep path". `select-edge` does *not*
  leave sweep mode, so clicks on rail rows inside the annotator are
  unchanged.
- **A chain study posts `goto <topology> "" <study>`, not `trace`.** The
  handoff says "the goto the row would have posted". The toolbar's
  View-in-3D button still posts `trace`, as an explicit launch.
- **Explicit launches are not undone by the follow.** A row's 3D control marks
  the selection it came from as already followed, so the next paint does not
  re-drive the pane back to that selection's plain goto and drop the
  `isolate`.
- **`highlight` borrows the pick's tint and gives it back.** `highlight clear`
  re-tints a picked face if there is one. It never opens a part: a binding
  on a part that is not in the scene is a note. An unbound edge writes one
  line to the annotator's own console output (`> highlight t e` / `no binding
  for e`), never to the banner.
- **Stack mode asks the pane for nothing.** `VA.annotateParamsFor` returns
  null there, so a pane opened on a stack shows the annotator with no
  element, and moving to a stack leaves the pane as it was.

## What the pane cannot do on file://

Nothing. Under file:// there is no origin to share, so `VA.probeAnnotateMount`
fails. The head's **3D** control is then not rendered at all (absent, not
disabled: the standing absent-feature rule), and every row keeps its
plain new-tab link to the annotator. The surface says nothing about the
pane. The handoff's "and that it says so" is this lesson; a sentence on the
surface would explain a feature the reader cannot see. A TRUTH check covers
the file:// half.

## The hosted bake needs no new mount

drawing-checker's `webui/analyses.py::tolstack_mounts()` already registers
`VIEWER_MOUNT` and `ANNOTATE_MOUNT` (both `html=True`), and the static export
bakes from that same list. Every file this change touches lives under one of
those two directories. No drawing-checker change is needed.

## Nothing is bound in the live inbox

`data/inbox/feature-identity/` holds only its README. So on real data,
hovering a row highlights nothing yet: every edge answers "no binding". The
TRUTH suite reads one synthetic binding: the study's first contributor edge,
bound to face 0 of the first part the sweep opened. A getter resolves it when
the annotator reads it. It is the only fact the hover check needs, and the
binding resolution it exercises is the annotator's own.

## What the sweep-rail handoff needs

- Row hover inside the annotator's own sweep rail can call the same
  `highlight` verb. It already works at the current sweep frame.
- If the rail adds a verb that changes the mode or subject (picking a study
  inside sweep mode, say), register it through `announced(...)` so the
  viewer's head line follows.
- Don't route the rail's own row clicks through `goto`. That leaves sweep
  mode now. `select-edge` stays in it.
- The TRUTH suite (`3D pane follows the selection …`) reads
  `window.__sweep.openedBySweep[0]` as the part to bind. If the rail changes
  which parts sweep mode opens, that suite's synthetic binding follows on its
  own, but its hover check needs at least one opened part.
- The pane posts `["sweep", <run>]` for a kinematic study, and the run picks
  its own topology (existing behaviour). The run that the kinematic study
  folds is still the older P2 (`ISSUE_20261020_the_blade_pitch_kinematic_study_folds_the_older_p2_run.md`),
  so the pane opens that run, not the newest one.

## Gotchas

- **Booting the embedded annotator on real data in a TRUTH test:**
  `page.addInitScript` runs in *every frame*. Add `mock=1` to the
  annotator frame's own URL with `history.replaceState` before its module
  reads `location.search`, then point the memory adapter's reads at the
  served `data/`, the same approach `apps/annotate/run_browser_check.mjs`'s
  real pass takes. The viewer itself stays non-mock.
- With more than one sweep run published, the bar's run label is the
  **run picker's** chosen option, and the summary line leaves the mechanism
  out. With one run, the summary line names it.
- A browser check needs a non-throwing action before it whenever its own
  mutation removes the thing that action touches. The nav-hidden witness
  first came back NOT WITNESSED because the nav click timed out and took the
  suite down before the nav check was recorded.
- The main-checkout edit guard reads a junction whose *target* is a
  tracked-placeholder directory (`data/inbox`) as a write to it. The scratch
  data root here is therefore a **copy** (348 MB) of `data/inbox`,
  `data/meshes` and three projection directories, plus junctions only for
  `docs` (to this worktree) and `venv-win`.
- `<<'EOF'` heredocs through the Bash tool collapse `\\` to `\`, as noted in
  the previous lesson. Patch scripts that contain backslashes go in scratch
  files.

## Verification, as recorded

Every `[real]` and browser run read projections built **from this branch's
committed tree** into `C:\workspace\tolstack\data\scratch\three_d_pane\`
(gitignored). The main checkout sits on `master` with stale projections, and
rebuilding the shared `data/projections/viewer/` from a worktree overwrites it
for everyone. The freshness check paired all four files with the tree each
time. The browser tiers ran with `node_modules` junctioned into the worktree
from the main checkout. That junction, and the scratch root's `docs` and
`venv-win` junctions, have since been removed. The scratch root now holds
only copied data plus the built projections. Delete it after the review.

- `node apps/viewer/run_tests.cjs --repo <scratch root>` at `f9ba494` (the
  final code): **544/544**, no tier skipped.
- `node apps/annotate/run_tests.cjs`: **197/197**.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch root>`, full
  run at `9801bdb` (the final code; only this lesson came after): **27/27
  suites** in 146 s, including the new `3D pane follows the selection …`
  (12/12) and the reworked `annotate flyout …` (45/45, now at 1920 wide).
- `node apps/annotate/run_browser_check.mjs`: **67/67**.
- `node scripts/run_mutation_witness_tests.mjs --only <guard> --repo <scratch
  root>`, once for each of the **18 new specs: 24/24 mutations witnessed**.
  There are 18, not the 16 the enrolling commit's subject says: 3 fast, 2
  annotate and 13 browser.
  The first run of the `[real] the nav stays beside the open pane` spec came
  back NOT WITNESSED, from the aborted-suite gotcha above. After the fix it
  was witnessed. Both re-pointed specs (closing the flyout puts the page
  back; opening the flyout moves the DAG pane) were also re-run: witnessed.
  The full registry run was **not** run here (tens of minutes). It belongs at
  the merge in the main checkout, per the repo's CLAUDE.md.
- `venv-win/Scripts/python.exe -m pytest -q` (worktree, at `653ac7c`, before
  the pane suite's nav-click hardening and this lesson):
  **1 failed, 1508 passed, 1 skipped, 5:00**. The failure is the documented
  worktree-only red (`tests/test_viewer_js_suite.py`: no projection in the
  worktree). The skip is the `test_fit_bound_features.py` re-extraction that
  is not installed. The witness, architecture-inventory and JS-vocabulary
  modules re-ran on the final tree: 81 passed.
- Not run: `scripts/rebuild_projections.ps1` itself. It refuses to run from
  a worktree, and in the main checkout it would rebuild out of `master`.
  This change touches no projection input.
