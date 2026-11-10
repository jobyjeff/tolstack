# LESSONS 2026-11-09 — the_demo_path_reads_cleanly_on_a_projector

The five demo clicks at 1920×1200 now show no warning chip, the grid's PART to
ELEMENT columns beside the open scene, plain Preview copy, heavier lines and a
clean console. Shots are in `shots/the_demo_path_reads_cleanly_on_a_projector/`:
`before/` (this tree before the change) and `after/` (the same tree after it).
Both sets come from `node tests/debug_integration_walk_20261108.mjs --phase demo
--shots …`, and I looked at every shot.

**Why `--phase demo` and not `demo8000`:** port 8000 serves trunk
(`3d04f5cd` today), so it cannot show a branch. The `demo` phase makes the same
five clicks on this tree's `apps/`, over the main checkout's projections. Run
`demo8000` once this lands and the batch merge moves trunk.

## What the DoD asked to quote

**The chip state in each of the five clicks** (`#flyout-status`):

| click | before | after |
| --- | --- | --- |
| 1 open v2 | no pane | no pane |
| 2 Colour by Body | no pane | no pane |
| 3 open the 3D pane | amber "folder needed" | none |
| 4 play the sweep | amber "folder needed" | none |
| 5 select the tan-link length row | amber "folder needed" | none (bind mode, nothing picked yet) |

The chip appears once a write begins: a face picked to bind, a pick armed, or a
write pressed. That is `beginWrite()` in `apps/annotate/app.js`, the rule is
`AA.paneStatusShown`, and the first write still asks for the folder itself. The
browser check "the scene pane reads over HTTP" picks a face and then sees the
folder-needed word.

**Visible grid columns with the pane open** (1920×1200, from
`tests/debug_demo_path_layout_20261109.mjs`):

- before: nav 300 | scene 560 | DAG+grid 497 | Preview 560. No grid column was
  on screen, only the body gutter.
- after: nav 300 | scene 400 | DAG+grid 1003 | Preview 214. PART, DESCRIPTION,
  # and ELEMENT are all on screen, in all three states (open, sweep, row
  selected).

**Computed stroke widths** (`getComputedStyle`, at 1920):

| mark | before | after |
| --- | ---: | ---: |
| dimension bar | 4px | 4px |
| rails (`line.rail`, `path.rail__link`) | 2px | 3px |
| DAG-to-grid leader (`path.rail__leader`) | 1.5px | 2px |
| 2D-to-3D leader (`.seam__leader`) | 1.5px | 2px |
| body container | 1.5px | 2px |
| part container / block | 1.25px | 1.5px |

Hover, lead and selected states each moved up one step with their base. The
browser check "a hot rail is drawn thicker" holds, with rail 3 against hot 4.

## The final weights, and why

The issue recommended rails 2.5–3, leaders 2 and part containers 1.5. The 1920
shots argued for the top of the rails range: at 3px a rail still reads as the
second-heaviest mark after the 4px bar, and 2.5px sat too close to the new 2px
leaders. Body containers went to 2 so they stay heavier than part containers.
Hierarchy: bar 4 > rails 3 > leaders 2 = body containers 2 > part containers 1.5.

**Not changed:** the grid's brackets. A part's bracket is a 1.5px CSS border, and
Chrome draws a border at a whole device pixel, so at DPR 1 it is 1px. That is
the thinnest mark left on the page, and it was outside the issue's list. It is
one line in `.tvbrace--top/--bottom` if the next walk calls it thin.

## The layout choice for the grid beside the pane

At 1920 the row had to hold nav 300, the scene, the DAG with its leader fan
(416px, fixed by the leader count) and the grid through ELEMENT (586px after the
doubled number went). There is not room for that at full Preview width. I tried
three splits and chose the third:

1. **Doubled number dropped (expected, done).** A part's number is said once, in
   its bracket (`VA.gridPartLabel`), and the PART column narrows from 264 to
   196px. The PART cell still prints the number when Groups → parts is off.
2. **Scene squeezed (tried, rejected).** With a 280px floor the grid fit, but the
   sweep bar was crushed (`scratchpad` shot `layout_1920_sweep.png` at 291px).
   The scene is the demo's main subject.
3. **The Preview gives way (chosen).** While the scene is open, the Preview is
   `clamp(200px, 100vw − 1706px, 560px)` (`topology.css`, `body.flyout-open`).
   1706 is nav 300 + scene floor 400 + about 1002 of drawing and grid, plus
   dividers. That gives 214px at 1920 and the full 560px from about 2270 up. A
   width the reader has dragged still wins. The scene's clamp now keeps the
   drawing **and** the grid through ELEMENT (`graphNeed` + `VA.gridKeptWidth`),
   so it drops to its 400 floor whenever the room is short.

At 1600 with the pane open only PART fits, the same as before the pane opened
(1600 was never readable with the Preview at 560). At 2560 the scene keeps its
560 and the grid shows through NOMINAL.

Knock-on fixes the narrower widths made visible, all in this change:

- A Preview chip longer than the pane wraps inside its pill instead of clipping
  ("DERIVED — the quantity a study computes").
- The sweep readouts keep each label and its value on one line at 400px. The
  grid floor is now `min(190px, 50% − 10px)`.
- The sweep bar's head row still clips "Export points" and the loop select at
  400px. That is filed:
  `ISSUE_20261109_the_sweep_bars_head_row_clips_its_controls_at_the_scenes_400px_floor.md`.

## The preview strings changed

| site | before | after |
| --- | --- | --- |
| `VA.VALUE_SOURCES.derived.title` (chip hover) | "A derived gap: two real interfaces with no dimension between them. This is the answer, not a term — a study is refused if it puts this edge in its selection, and names it in \`closes\` instead." | "The gap between two real interfaces that a study computes as its answer." |
| `VA.VALUE_SOURCES.inline.title` | "…(topology-first authoring…). It is in no stack file, so no crop index covers it." | "Its dimension is written in the topology document itself, for a system authored topology-first." |
| `VA.VALUE_SOURCES.stack_ref.title` | "…names an element of a committed stack (dimension_ref) and the loader resolved… The topology cannot drift away…" | "Its dimension is an element of a committed stack, read with its value, citation and role." |
| no-crop line (new `crop` field, one per source) | title + " No crop index covers it — that is the state of the documents, not a stale projection." | derived: "A study computes it from the dimensions on either side." · inline: "Its crop appears here once this number cites a drawing." · stack_ref: "Its crop appears here once the stack's element cites a drawing." |
| assumed citation | "Its citation is kind \`assumed\`: there is no document behind it to crop." | "Its value is an assumption; its crop appears here once a drawing backs it." |
| transform line | "default transform: identity" (monospace, on every edge) | nothing for one-to-one; "scaled 2.5 deg per mm" otherwise, not monospace (`VA.transformWords`) |
| chain-study note | "No sign is authored anywhere: … This study OVERRIDES the edge's default transform with \`id\`." / "The edge's own default transform applied." | "Its sign is read off the direction the chain crosses this edge." plus " This study scales it its own way." only on an override |
| chain-study row | "transform  arm_linear_to_rotary ×2.5" | "scale  ×2.5" |
| stack page help (same class, found by the new ban) | "\`traced\` beside no export" · "its \`checks\` array is empty" | "“traced” beside no export" · "its checks list is empty" |

The backtick is now in `apps/viewer/reader_facing_bans.js`, and a new test walks
every value source's two strings for backticks, negation and length.

**Left on purpose:** "No value recorded; M2 adds the term. …" is authored text
in 22 notes of `docs/topologies/topology_vpa_end_stop_v2.json`. Changing it
changes a projection input, which forces a rebuild of the shared projection that
port 8000 serves. Filed:
`ISSUE_20261109_the_end_stop_models_notes_say_m2_adds_the_term_on_the_demo_path.md`.
The deep-link and drift notices that still print ids in backticks are filed for
a design call: `ISSUE_20261109_deep_link_and_drift_notices_print_ids_in_backticks.md`.
"This dimension cites nothing at all" and "No document backs this number" state
an absence, the repo's first-class outcome, and were kept.

## The console 404

There were two different 404s:

- **Port 8000:** the browser's own `/favicon.ico`, which drawing-checker's mount
  does not serve.
- **The repo-root servers the debug scripts use:** the HTTP probe asking the
  sibling mount's `../data/topologies.json` first.

Fixes: `VA.httpCandidateOrder` tries the candidate the page's path names first
(`…/apps/<app>/` means repo-root; anything else means the sibling mount), and
both are still probed. An empty icon is added on served pages only.

**Gotcha:** a static `<link rel="icon" href="data:,">` turned the `file://`
topology suite red. "A reload gets the remembered pane width back" failed, and
so did the nav width, while trunk passed 209/209 and removing the line made it
green again. The icon is now added from a one-line script when
`location.protocol !== "file:"`, and all four topology suites pass. I did not
dig into why a `data:` icon delays a `file://` reload's restore. Anyone who
touches `<head>` should re-run `--only "topology file://"`.

## Other notes

- **Mutation specs moved by this change:** the PART cell's number line was the
  anchor of three other specs, and the seam leader's 1.5 was the anchor of one.
  I re-anchored them. My bulk `sed` also rewrote the *replace* of my own new
  spec into its *find*, a silent no-op mutation. It is fixed, and every spec was
  checked for `find === replace`. Re-anchor by script, never by blind `sed`.
- **Browser tier from a worktree:** the runner imports `playwright-core` by name.
  I made a temporary `node_modules` junction to the main checkout
  (`mklink /J`), as the 2026-11-03 lesson did, and removed it with `rmdir` before
  the last commit.
- **pytest:** this venv has no xdist, so `-n 16` is unrecognised and the tier
  runs single-process.

## Suite record

See the completion report, which repeats these figures.

- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 674/674.
- `node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack`: 305/305.
- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` (worktree):
  1889 passed, 2 failed, 1 skipped, in 467s.
  - `test_every_anchor_resolves_to_exactly_one_place` was fixed afterwards by the
    re-anchoring (`tests/test_mutation_witnesses.py`: 44/44).
  - `test_viewer_js_suite_is_green` is the deliberate worktree red: the `[real]`
    tier has no projection here. With `--repo` it is 674/674.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`:
  40/44 in 1896s.
  - Two reds are trunk's, owned by the parallel two-red-suites handoff: rail holds
    still (6 sub-checks) and the model drawn alone (1).
  - `suite file://` timed out on a page load while pytest was running, and passed
    alone.
  - `topology file://` was the favicon gotcha above, and passes after the fix.
  - The scene-over-HTTP suite, whose CSS changed mid-run, passed alone at 10/10.
- `node scripts/run_mutation_witness_tests.mjs --changed-since master --repo
  C:/workspace/tolstack`: **22/23 witnessed, 23/37 reached in 28m33s, 14 left to
  the sweep (budget)**.
  - The one miss, `browser__real-the-nav-stays-beside-the-open-pane…__25decf2b`,
    is NOT WITNESSED on trunk `3d04f5cd` as well (`--only` in the main
    checkout). It is a pre-existing decay, filed as
    `ISSUE_20261109_the_nav_stays_beside_the_open_pane_witness_has_decayed_on_trunk.md`.
  - The budget left my three browser specs to the sweep, so I ran each with
    `--only`. All are WITNESSED: "a pane just opened wears no status chip"
    (2m04s); "[real] while the reader only watches the sweep" (1m41s); and the
    status-word check's two mutations, including the one moved from the retired
    spec (5m48s).
  - My three fast specs and the annotate spec were reached and WITNESSED in the
    capped run.
- Wall times recorded with `dispatch suite-time`:
  - default tier 467s: inside budget.
  - browser tier 1896s: over budget by 1m36s while pytest ran beside it. The
    measurement is appended to the open
    `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`.

## Found on arrival

Clean worktree; nothing.
