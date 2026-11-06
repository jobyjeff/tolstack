# LESSONS 2026-11-05: the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what

## What landed

- **Brackets.** `VA.gridBraces(plan, {study, foot})` in `apps/viewer/topology.js`
  is the model, and `VA.braceGeometry` in `views/topology.js` turns it into
  pixels. Each group is a pair of thin rounded caps: one over its first row,
  one under its last. The kinds are the study (kinematic or chain), each
  sub-stack (a depth-0 one is kinematic, a nested one is chain), and a rigid
  body that spans more than one part. A part boundary inside a group is a
  plain rule. The caps sit in an inert overlay (`div.tvbraces`) placed by row
  count. Every row is exactly `rowHeight` tall, so the overlay moves no
  leader seam. Row tints, dividers, the sub-stack rule and the red/magenta
  washes are gone, along with `VA.gridRowMarks` and the `--tv-divide-*` and
  `--tv-stack-rule*` tokens. The DAG still uses `--tv-body-*`.
- **PART | DESCRIPTION.** `VA.partColumns(part)` takes these from the part
  record. The number is the record's `drawing`, else the part-number token
  in its name (`NAS6403U11D`). The description is the name with its own
  number taken out. Round 2 turned that order round (the review's nit). They
  differ on one part: the pitch plate's record is the installation
  `215177-001`, while its title-block name gives the detail
  (`Pitch plate 215735-001/-002`). The row says `215177-001`, and the
  whole name is on hover. Each row has its own
  pair of cells, with the words on a part's first row only. So every row's
  part cell is clickable and selects that row. The old merged cell
  deliberately selected nothing.
- **One sourcing mark.** `VA.rowSourcingMark` → `VA.SOURCING_MARKS`, in
  precedence order: untraced, no citation, no value, inferred, no tolerance.
  The mark is the nav's own triangle (`VA.warningIcon`) in the state's
  colour, and a traced row has none. Its hover gives the state in one
  phrase. A term with no band is `no_value` whatever its edge's citation
  says. The kinematic gap card now opens from the mark. The legend lists
  every mark and "no mark: …", which also closes the routed legend issue.
  The criterion's BUDGET chip moved into the criterion cell.
- **No crop column.** The crop is the Preview's, as it already was.
- **One horizontal scroll.** `.tv__rails` is no longer `position: sticky`.
  The drawing, its leaders and the grid are one strip, so a sideways drag on
  the DAG moves all three together and nothing sits behind anything. The jog
  grip is now a plain content coordinate (`VA.jogGripInset` has no clamp). A
  study arrival never puts space to the drawing's left (`bandPad.left` is
  always 0). It scrolls sideways only when the band is off-screen.
- **Fit leaves the grid a floor.** `VA.dagFitWidth(pane)` = max(pane −
  (PART + DESCRIPTION + # + ELEMENT), 35% of pane). This applies to the
  reader's own Fit (the control, or `0`), **not to a study's arrival**. I
  first applied it on arrival too. The arrival's fit is measured off the
  outgoing layout, so the floor there moved the transition's first frame and
  ratcheted the zoom down a little on every study change. That turned five
  browser suites red for reasons a reader would also feel. An arrival scales
  down only to fit the pane, as on `integration`.

## Round 2 (review 2026-11-06: REQUEST CHANGES, two blockers)

- **Merged `integration` into the branch**, which carried out
  `ISSUE_20261105_the_grid_and_dag_colour_branches_…` (now resolved).
  - The grid kept its legend and rows.
  - The DAG-colour branch's "the sourcing legend names every tint the grid's
    rows wear" guard was retired with its spec, because no grid row wears a
    tint now.
  - `--wash-untraced` / `--wash-nocite` and the legend-swatch rules were
    deleted. Nothing else read them.
  - The `--group-*` fallbacks were dropped, now that the tokens are on the
    page.
- **Element names are whole.** `integration` retired
  `VA.elementDisplayLabel` (another handoff made the element cell print its
  authored name whole, with that string as its title). The handoff's "keeps
  shortening" is overtaken, so the name cell takes integration's form.
- **Blocker 1, totals clipped:** the widths were re-measured, and the
  browser check now pins the result. See the width budget below.
- **Blocker 2, routed issue:** it stays open. See "What gives" below.
- **Found while re-taking the shots:** a 560px phantom sideways scroll at
  3840 once the 3D pane opens. It is fixed, and a browser check pins it.

## Decision not in the handoff's words: deliverable 6

The handoff reads "Dragging the DAG horizontally scrolls the grid with it,
and the grid may run behind the DAG canvas". Jeff's note reports the second
half as the bug: "it can even move behind the dag canvas". I built one
scroll that moves both together, with the grid **never** behind the DAG.
The browser checks assert that no DAG mark is past the grid's left edge at
any scroll (`dagPastGrid <= 1`).

## Brace geometry (`VA.GRID_BRACE`)

- inset 7px a side per level, so an outer bracket is 14px wider than the
  next one in;
- the curl (cap height) is `clamp(2, (rowHeight − 14)/2, 6)`: 6px at
  comfortable (26px rows) and 2px at compact. It stays in the space above
  and below a row's text, so a cap never runs through a word;
- caps from several groups on one edge step 2px apart, outermost outside;
- a row's first words start at `4 + cover × 7` px, where `cover` is how many
  brackets hold it (`model.cover`);
- hue per kind: `--group-kinematic/chain/body/part`, the DAG's own group
  borders, so a bracket and its group's border on the DAG are one hue. In
  round 1 they fell back to existing inks until the DAG-colour branch landed.
  Round 2 merged it and dropped the fallbacks.

## Width budget (px)

Each width is measured on the real projection against the longest thing its
column prints, **in totals rows as well as member rows**. Round 1 measured
member rows only, and its 68px number columns cut the M10 grip's RSS bound
to `-13.735…` with nothing on hover (review round 1, blocker 1). The rule
now: a number never clips, a header word never clips, and words (DESCRIPTION,
ELEMENT, a sub-stack's or a check's label) clip only with the whole text as
the cell's title. The browser check "no grid number and no part number
clips" holds that on the three studies with the longest totals and part
numbers.

| column | integration | round 1 | now | longest thing it prints |
| --- | ---: | ---: | ---: | --- |
| component → part | 120 | 100 | 112 | `NAS1149V0332H` inside its brackets' indent, 109 |
| description | — | 140 | 140 | words; clips with its title |
| # | 38 | 30 | 30 | two digits |
| element | 210 | 220 | 220 | resizable; clips with its title |
| nominal / min / max | 80 ×3 | 68 ×3 | 84 ×3 | a totals row's RSS bound `-13.735566`, 82 |
| sensitivity | 70 | 76 | 92 | its own header word, `SENSITIVITY` |
| contribution | 170 | 200 | 270 | `+ 1.953125 × -0.029297 … 0.029297 deg`, 264 |
| sourcing | 260 | 30 | 30 | one 16px mark |
| crop | 110 | — | — | in the Preview |
| **total** | **1218** | **1000** | **1146** | |

## What gives at narrow widths

Measured on the final tree with the nav at 300 and the Preview at its 560
default.

- **3840 with the 3D pane (560) and the Preview open:** the pane is 2417px
  and the grid 1146. The DAG is 420 on the kinematic study, 354 on the chain
  study and 324 on the grip studies. Nothing scrolls sideways on any of the
  five shots (`.tv__hscroll` scrollWidth = clientWidth = 2417), and every
  part, element and total cell takes the click (15/15 on the kinematic study
  with the folds open). Round 1's 3840 shots hid a 560px phantom scroll on
  the chain and grip studies: the zoom box's floor was the pane's width
  before the 3D pane opened (2977). The pane's ResizeObserver now
  re-measures it (`VA.sizeTopoZoomBox`), and a browser check holds that.
- **1600 with the Preview open, kinematic study:** the pane is 737. On
  arrival the DAG is 310 wide. PART, DESCRIPTION and # (282) are fully on
  screen and ELEMENT is 145px of its 220. Every part and element cell takes
  the click (6/6; `kin_1600_arrival.png`). After Fit the DAG is 246 and
  ELEMENT is 209 of 220 (`kin_1600_fit.png`). The numbers and CONTRIBUTION
  are one sideways scroll away (`kin_1600_scrolled_sideways.png`), and the
  DAG moves out of view with that scroll rather than covering anything. So
  at rest the **total is not on screen at 1600**: that is what gives. The
  handoff's "part, element and total are clickable" holds for part and
  element at rest, and for the total after one sideways scroll.
- **Order of what gives:** first the DAG's fitted scale on Fit (down to 35%
  of the pane), then the strip scrolls sideways. No column hides, no number
  is cut, and the Preview is not collapsed.
- **Whole walk at 1600:** it still opens at zoom 1 (a 678px DAG), leaving
  59px of PART at rest. Those cells are clickable, and Fit takes the rails to
  127 (`walk_1600_fit.png`). The routed issue
  `ISSUE_20261104_at_1600_wide_the_product_graphs_rails_leave_the_grid_a_59px_slit.md`
  stays open: review round 1 found it would have auto-resolved at Complete
  with its repro unchanged (blocker 2). Its `handoff:` link to this handoff
  is removed, and an update says what changed and what is left. The
  continuation issue I filed in round 1 is folded into it.

## Shots

In `shots/the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what/`,
all retaken on the final tree in round 2 except `before_kin_1600.png` (the
grid as it was): `kin_3840_3d.png`, `kin_3840_grid_crop.png` (the brackets
up close, folds open), `grip_3840_grid.png` (U5H), `grip_u10h_3840_grid.png`
(the longest RSS total, whole), `chain_3840_grid.png`, `grip_1600.png`,
`kin_1600_arrival.png`, `kin_1600_fit.png`, `kin_1600_scrolled_sideways.png`
and `walk_1600_fit.png`.

## Gotchas

- **The main-checkout edit guard blocks junctions into `data/inbox`**,
  because the target holds a tracked README, even when the junction lives in
  gitignored scratch. I copied `data/inbox`, `data/meshes` and
  `data/projections` (≈350 MB) into the worktree's
  `data/scratch/root/data/` instead, plus `docs/` (the worksheets are read
  from `--repo`). I rebuilt the six projections there from the **committed**
  tree: a dirty tree's stamp fails the `[real]` gate.
- **The DOM shim has no `firstChild`.** `sourcingCell` hangs the mark on
  `cell.mark` for the callers that wire a card to it.
- This repo's pytest has no xdist, so `-n 16` fails at argument parsing. Run
  it serially.
- Renaming a guard orphans its spec, and the spec's file name is derived
  from the guard's name. Delete the old spec and write the new name that
  `--unenrolled` prints. `scripts/guard_enumeration.mjs` pins the count and
  the name-set hash for each source.
- **A row's centre is under the rails' strip now.** Playwright's
  `locator(row).hover()`/`.click()`, `scrollIntoView` on a row, and the
  `clearPoint` fallback all scroll the strip sideways to reach a 1000px row's
  middle, and the DAG goes with it. Every seam and DAG check that aims at a
  row now aims at its part cell, or puts `scrollLeft` back after a vertical
  scroll. On `integration` (sticky rails) the same calls were harmless.
- **The leaders' jogs bunch together**, so their 10px hit strokes overlap at
  a jog's midpoint. The hover check takes whichever leader's hit path is on
  top rather than requiring the one it measured.
- **A witness can decay inside the branch that changes its subject.** The
  11-03 mutation "the transition draws no pad" changed nothing once no
  arrival puts a left pad, and the real route has no top pad (`pad 0 -> 0`).
  I dropped it, and the "never a left pad" mutation stands in its place.
- **Once the rails scroll with the grid, a wider column changes what the
  browser checks do, not only what they see** (round 2). Playwright scrolls
  any cell that is not whole on screen into view before a `hover()` or
  `click()`. The sticky rails used to hide that, and now the drawing moves
  with it. Two checks went red after the columns were re-measured:
  - The leaders' hide toggle: a 13 px scroll hid every dot.
  - Served mode's spec citation: the click raced an arrival that put the
    scroll back.

  Neither red was the product. Before blaming one, log `scrollLeft` around
  the step, along with what set it (a patched `scrollLeft` setter and a
  `scroll` listener that records the last pointer event both found these).

## Found on arrival

Nothing: the worktree was clean and the branch matched `integration`.

## Blocked actions

- The main-checkout edit guard refused a junction from the worktree's
  gitignored scratch into `C:/workspace/tolstack/data/inbox` (the target
  holds a tracked README). I copied the inputs instead (Gotchas above) and
  did not work around it.
- Round 2: `Stop-Process` by pid on my own hung shell was refused as
  interfering with workloads. A bare `python -` ahead of a `||` was waiting
  on stdin. I stopped it through the harness's own task stop instead, which
  ends only the task the session started. Write a one-off script to a file,
  or give the heredoc to the interpreter that runs it, never to a fallback.

## Verification record (round 2)

All runs are from this worktree, on the committed tree after the round-2
merge of `integration` (`f9e8ca5c`). The data tiers read the scratch root
`<worktree>/data/scratch/root`. Its inputs were mirrored read-only from the
main checkout. Its vocabulary, topology, viewer, part-names, crops
(drawing-checker's venv), contact-suggestion and kinematic projections were
rebuilt from this branch before any tier ran. The worktree's `node_modules`
is a gitignored junction to the main checkout's.

- `node apps/viewer/run_tests.cjs --repo <root>`: **645/645** (fast and
  `[real]`), on `0e898375`. The two harness fixes below touch only the
  browser tier.
  `node apps/annotate/run_tests.cjs`: **291/291**.
- `node scripts/run_viewer_browser_tests.mjs --repo <root>`, final run on
  `80f85b5e`: **40/42 suites, 1606 s**, recorded `--tier merge`: inside budget.
  Served mode passed with both of its fixes in. The reds were the two
  inherited kinematic-page checks, and the leaders sub-check "...and at
  1920x1080, after the window grew under them". That is the other one the
  DAG-colour review recorded as a load flake. Alone, the leaders suite
  passed 26/26 on `62170b4c`.
- Earlier full runs this round, all **39/42**, each recorded `--tier merge`
  (inside budget):
  - 1711 s on `0e898375`;
  - 1628 s on `62170b4c`;
  - one unrecorded diagnostic run, 41/42.

  Their reds fall into four groups:
  - **Integration's own red: two kinematic-page checks.** "hovering a
    sensitivity shows its curve…" and "clicking a term row selects
    pitch_plate_attach_height…" still match the edge names that `2e97a77a`
    renamed. This is filed (high) as
    `ISSUE_20261106_two_kinematic_page_browser_checks_still_match_the_old_edge_names.md`,
    and the DAG-colour review measured it on `integration` itself. I left it
    to that issue, because it is not this branch's change and someone may
    already have taken it.
  - **Leaders, "switching the toggle to hide … re-draws every leader": mine,
    and fixed in the harness (`62170b4c`).** It was red in full and solo
    runs. The cause was this round's wider PART column. In the narrow
    3D-open strip (177 px), the part cell overran the right edge by 13 px.
    The suite's own `hover()` therefore scrolled the strip sideways, and the
    rails now scroll with the grid. Hide re-lays a narrower drawing (78 →
    58 px), which put all four dots behind the left edge. Dropping those
    leaders is the documented rule, so the app is right. The check now
    starts from the strip's left edge. Its witness `08418ecc` passed with
    `--only`: **1/1, 3m28s**.
  - **Served mode, "a real spec citation reaches the row's Preview" and its
    crop: a race, fixed in the harness (`80f85b5e`).** It was red in both
    loaded full runs and green alone. The probe showed the click never
    selected the row, even on green runs. The topology arrival was still
    landing and put the strip's sideways scroll back after `clearPoint` had
    brought NOMINAL in. The check passed only when the hover's text
    arrived in time. It now waits for the landing. Solo, the row ends
    selected and its preview `frozen`.
  - **Load flakes, which pass alone.** Leaders "a row the scene marks
    selected…" (`picked false`) is the one the DAG-colour review recorded as
    load. DAG zoom "scrolled down the kinematic page's grid, the header is
    held…" is round 1's timing flake.
- `node scripts/run_mutation_witness_tests.mjs --changed-since integration
  --repo <root>` on `62170b4c`: **34/43 witnessed, 43/60 reached in 30m50s,
  17 left to the sweep (budget)**, exit 1, 1875 s. It was recorded `--tier
  merge` as **OVER BUDGET by 1m15s**, appended to
  `ISSUE_20261106_the_changed_since_witness_gate_overruns_its_merge_budget_by_the_entry_the_cap_let_start.md`.
  All nine misses are kinematic-page entries, for example `1465036e`,
  `949839ef` and `b9a9ce66#1/#2`. Each says "the tier was red before the
  mutation": its baseline is the kinematic suite, red with the inherited
  names issue above. Nothing was proved either way, and none is this
  branch's spec.
  - An earlier run on `0e898375` took 2359 s (30m36s reached) and was
    recorded at **OVER BUDGET by 9m19s**. About 9 minutes of that is
    outside the runner's own clock. Its 15 misses were the same baseline
    reds, plus the leaders suite, which was red there.
  - `80f85b5e` changes only an unenrolled check, and the gate was not
    re-run for it.
- This round's own specs:
  - `8f1e16f6` (PART is the record's drawing, a fast spec): **WITNESSED**
    in the gate above, 23s.
  - `c6c298c8` (no number clips) and `ff2762ea` (the zoom box's floor
    follows the pane): the gate's cap left both to the sweep, so each was
    run with `--only`. Both were **WITNESSED**, in 4m30s and 4m29s.
  - `08418ecc`: witnessed with `--only`, as above.
- `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p
  no:cacheprovider` (serial; no xdist) on `0e898375`: **1729 passed, 1
  failed, 1 skipped, 2 deselected, 471 s**, recorded `--tier default`:
  inside budget. The failure is the deliberate worktree red
  `test_viewer_js_suite_is_green`, which reports its tier as skipped. Its
  tier ran in full above. I did not capture the skip's reason.
- The guard pins: fast 645 declared / 645 enrollable (`f5bb10e43e69`), and
  browser 837 declared / 804 enrollable (`2888e79c1f21`). The two harness
  fixes add no guard.
