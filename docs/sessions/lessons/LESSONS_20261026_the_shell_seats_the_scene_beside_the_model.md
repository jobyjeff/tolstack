# LESSONS 2026-10-26 — the_shell_seats_the_scene_beside_the_model

The viewer now reads nav | scene | DAG + grid. The 3D scene is a column of
the page's own row, not a panel docked at the window edge, and the
annotator's rail is drawn in the nav under the study row. Deliverables 1–4
are built. What follows is what the diff does not say.

## Which route the tree data took: the pane sends it, read off its own rail

The handoff offered two routes: the shell reads `../data/` itself, or the
pane answers a query. The pane sends it, for two reasons:

- **The shell cannot read the sweep run.** On the served origin,
  `inbox/linkage-sweeps/<run>.json` answers 404 (the rail lesson measured this
  on 2026-10-26). The annotator has the run through its folder grant, or
  through the memory adapter in the TRUTH tier. So only the annotator holds
  all three inputs: `bodies[]`, the kinematic projection and the run's joints.
- **One rendering, not two.** The annotator still builds its rail with the
  same code, embedded or not. Embedded, the rail is laid out but not shown:
  `visibility: hidden`, absolutely positioned, with no pointer events. Then
  `postEmbedTree` (app.js) walks the DOM it just rendered and sends the rows
  as data. A row counts as "shown" only if it has layout boxes
  (`getClientRects()`). So a closed `<details>`, a group hidden by a chip,
  and bind furniture in sweep mode are dropped by the same CSS that hides
  them on the standalone page. This is why the rail is not `display: none`:
  the mirror reads visibility off the layout.

A gesture on a mirrored row comes back as `annotate:rail {key, act}`. The
annotator replays it on the node it mirrors: it dispatches
`mouseenter`/`mouseleave`, calls `.click()`, or flips `.open`. The handler
that runs is the rail's own, so the shell composes no command. "Through
`highlight`/`inspect`/`select`" holds one step removed: those are what the
rail rows run. The shell never posts them for tree rows.

When the tree is sent: a `MutationObserver` on the rail, coalesced to one
post per task, deduplicated by JSON. It is also sent, forced, after every
announced verb (`sweep`, `goto`, `trace`), because the shell clears its copy
whenever it re-drives the scene, the same way it clears the head line.

**Keys.** A key is the parent's key, then `/`, then the node's `data-`
attributes sorted (or its words when it has none), plus `#n` for a
duplicate. Examples: `#sweep-tree/body=blade`,
`#sweep-tree/joint=pitch_link/direction=to,edge=…,feature=…,state=…`,
`#sweep-tree/edge=<edge>` (a contributor), and `#element-list/<edge name>`
(bind mode). The TRUTH checks address rows by these keys. A rail row that
gains a `data-` attribute changes its key.

**Open state belongs to the annotator.** A summary click in the nav sends
`toggle` and does not toggle natively. The redrawn tree carries the new
`open`. This matters because opening a joint selects it in the rail
(`inspect joint`), and the nav must not disagree with that.

## The message vocabulary after this change

This is the pane lesson's table, extended. Same-origin only in both
directions.

| direction | message | sent when |
|---|---|---|
| viewer → annotator | `{type: "annotate:exec", command}` | unchanged: the selection follows, a row's 3D control, the model row |
| viewer → annotator | `annotate:exec` `["highlight", t, e]` / `["highlight", "clear"]` | unchanged: the pointer settles on an edge's grid row, rail mark or kinematic row. The nav's scene tree is excluded (it carries its own hover) |
| viewer → annotator | `{type: "annotate:rail", key, act, index?}` (**new**) | a gesture on a row of the nav's scene tree. `act` is one of `enter`, `leave`, `activate`, `toggle`, `check`, `button` (with `index`); a chip is `button` 0 |
| annotator → viewer | `{type: "annotate:result", id, ok, result\|error}` | unchanged; still ignored |
| annotator → viewer | `{type: "annotate:state", mode, topology, study, run, title}` | unchanged; now also forces a fresh `annotate:tree` |
| annotator → viewer | `{type: "annotate:tree", mode, chips, rows}` (**new**) | embedded only: the rail's rendered rows changed, or an announced verb completed |

The boot url carries `embedded=1` (`VA.annotateEmbedHref`). "Open full page"
keeps the plain url. The leaders handoff's message type goes in this table.

A row's shape is documented once, above `embedTree` in app.js. A row the
annotator treats as unsettled carries `attention: true`. The shell colours
it amber and keeps no copy of the binding-state words; the CSS used to key
on the state names, and the vocabulary rule forbids that.

## The widths, measured

On the live `vpa_pitch_linkage_travel_between_end_stops` page at 1600×1000,
measured by the TRUTH suite, which prints the figures:

| state | scene | DAG + grid (`.tv__main`) |
|---|---:|---:|
| no scene open (preview pane at its 560px default) | — | **739px** |
| scene at its floor | 400px | **900px** |
| before this change, pane at its 560 floor (from the 2026-10-20 issue) | 560px | ~170px |

- `VA.FLYOUT_WIDTH.min` went from 560 to **400**. The 560 was the
  annotator's own 260px rail plus canvas. Embedded, the rail is in the nav.
  The floor is deliberately under the preview pane's width, so at the floor
  the DAG gets more room than with no scene open.
- The default width is `min(560px, 40vw)`, the preview pane's own width.
  Opening the scene in place of the preview leaves the DAG the width it had.
- The remembered width (`flyoutWanted`) and its per-page refit are unchanged.

## Decisions the handoff left open

- **The preview pane stands down on every page except a stack's.** This
  covers topology and kinematic pages. A stack page has no DAG to make room
  for, so it keeps its preview. The rule is
  `body.flyout-replaces-detail` (`syncSceneColumn`), written as one
  comparison, `state.mode !== "stack"`. A two-mode chain trips
  `test_no_viewer_vocabulary_is_spelled_as_a_comparison_chain`.
- **The scene stays a `<dialog>`**, now in flow. It is `position: sticky`
  under the topbar, the way the nav is. That keeps every `open`/`close`/
  `close`-event contract and the tests built on them.
- **No seam:** the column wears `var(--bg)`, has no border, the nav loses its
  right rule while the scene is open, and the divider's hairline is
  transparent at rest. The grip dots stay, because a control needs some
  resting mark.
  The annotator takes the viewer's `--bg` by reading the parent's computed
  token (same origin), for both its body and the WebGL clear colour
  (`scene.setBackground`).
- **The annotator's page title is hidden when embedded.** The column's head
  line already names what is shown. Without this, "tolstack — annotate" at
  page size was the loudest text in the column. The rest of its top bar
  stays, so Connect folder is still reachable.
- **The tree hangs under the active row:** a kinematic study, a chain study,
  or the topology row when no study is on. When the tree first arrives, the
  nav scrolls that row up (`revealSceneRow`), once per arrival. The
  kinematic section is the last thing in the nav, so the scroll often ends
  at the bottom with only the tree's first rows on screen (see
  `1920_kinematic.png`).
- **Keyboard:** disclosures are `<summary>`. A row with a click is
  `tabindex=0 role=button` and answers Enter and Space. Checkboxes and
  buttons are native. Focus sends `enter`, so the scene lights the row just
  as it does for a resting pointer. When the tree is rebuilt, focus is put
  back by key.

## Not built / left

- The standalone annotator's rail is still not keyboard-reachable. A dated
  addendum on `ISSUE_20261021_design_the_sweep_rails_repick_…` says so, and
  the issue stays deferred.
- `ISSUE_20261020_with_the_3d_pane_open_a_chain_study_page_leaves_the_dag_a_narrow_strip.md`
  now carries `handoff:` pointing at this handoff, plus the measured
  addendum, so Complete resolves it.

## Witnesses

There are 20 new specs: 2 fast and 18 browser. Two of the browser specs
replace specs whose guard names I renamed (`…pinned to the LEFT edge…` and
`…nav rail stays beside the open panel, to its right…`; the old files are
deleted). Four existing specs were re-pointed because this change rewrote
their anchor lines; their mutations mean the same thing:
`237dba65`, `8ce9bd17`, `9a4a093f` (its second mutation) and `25decf2b`.
Two guards went with no spec. `...and the flyout is still pinned to the left
edge while it grows` was a carry-over the new placement check covers. The
overlay-era premise `[real] the live drawing is narrower than the panel's
own floor` became false once the floor dropped to 400. Pins: fast 569/569,
browser 622 declared / 589 enrollable.

**One guard was born vacuous and was caught by its own witness:**
`[real] ...and leaving it takes the light down` stayed green with the row's
`leave` deleted. Two other paths cleared the light:

1. Leaving to the page's top bar fires the page's own `highlight clear`,
   which also clears the annotator's hover.
2. Just after `pause`, the rail rebuilds once (clearing the hover), and the
   row under the pointer sends `enter` again a moment later.

The check now pauses, waits, requires the light to hold, and leaves onto
empty chip-bar space inside the tree, where the page's handler stands aside.
Only then is it witnessed.

## Gotchas

- **The main checkout's projections are stale against integration.** They
  were built from master `ceac363`. The fast tier's `[real]` part refuses
  them, while the browser tier reads them without complaint. Every `[real]`
  number in this lesson comes from a scratch root built from this branch:
  `C:\workspace\tolstack\data\scratch\shell_scene\`, a 385 MB copy of
  `data/inbox`, `data/meshes` and `data/projections`, with the five
  projections rebuilt from this tree and a `docs` junction into this
  worktree. Delete it after the review.
- Even against a paired projection, the fast tier has one `[real]` red: the
  topology fixture lacks `variant_axis`/`tags`. It is already filed on
  integration
  (`ISSUE_20261026_topology_fixtures_lack_the_tags_fields_so_the_real_fixture_pairing_is_red_on_integration.md`).
  That red makes the witness runner report every fast spec as "red before
  the mutation" under `--repo <scratch>`. The fast specs were witnessed from
  the worktree instead, with no `--repo`, where the fast tier is green with
  its `[real]` part skipped.
- The rail-and-scene suite's two gap-badge checks are red on paired data.
  This is already filed on integration
  (`ISSUE_20261026_the_rail_gap_badge_browser_checks_read_gap_rows_integration_no_longer_has.md`),
  and the standalone annotator code they run is untouched here.
- Heredocs broke again on large patches, and a bash heredoc swallowed `\n`
  inside a Python string. Patch scripts went to the scratchpad through the
  Write tool.
- A witness spec can carry more than one mutation. Re-point by file, not by
  `mutations[0]`.

## Verification, as recorded

All runs were from this worktree. `node_modules` is a junction to the main
checkout's copy; it is gitignored and not committed. "Scratch" means the
paired root above.

- `node apps/viewer/run_tests.cjs`: **467/467**, with the node-fs tier
  skipped (no projection in a worktree). With `--repo <scratch>`:
  **567/568**. The one failure is the filed fixture-shape drift above.
- `node apps/annotate/run_tests.cjs`: **225/225**.
- `node apps/annotate/run_browser_check.mjs`: **72/72**.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch>`, full run:
  **29/31 suites, 245 s**. The two failures were `annotate flyout`, an
  overlay-era premise that has since been retired (rerun 46/46), and
  `annotate rail and scene`, the filed gap-badge checks. Reruns on the final
  code: `3D pane follows …` **27/27**, `annotate flyout` **46/46** and
  `annotate sweep rail` **15/15**. The sweep-rail suite ran with the bind
  snapshot unchanged and not regenerated.
- `node scripts/run_mutation_witness_tests.mjs --changed-since integration
  --repo <scratch>`: 51 declared mutations, 40 witnessed in the run, 2297 s.
  The other 11 were each settled with `--only`:
  - 9 fast mutations: witnessed from the worktree (see Gotchas).
  - The leave guard: repaired, then witnessed.
  - `the preview pane stands down`: errored mid-run because I re-pointed it
    during the run. Witnessed on rerun.

  Result: **51/51 witnessed**. The full registry was not run; it belongs to
  the merge.
- `venv-win/Scripts/python.exe -m pytest -q -rfs`, single process (xdist is
  not installed in `venv-win`), on the final code: **1 failed, 1579 passed,
  1 skipped, 5:48**. The failure is the documented worktree-only
  `tests/test_viewer_js_suite.py`, which finds no projection in a worktree.
  The skip is `test_fit_bound_features.py:424`, because the pitch-link bearing
  re-extraction is not installed. An earlier run also failed
  `test_no_viewer_vocabulary_is_spelled_as_a_comparison_chain` on this
  branch's mode chain; it was fixed (see Decisions) and is green here. Both
  the pytest run and the browser tier were recorded with
  `suite-time record`, and both were inside budget.
