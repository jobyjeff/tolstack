# LESSONS 2026-11-04 — the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit

Handoff: `docs/sessions/active/HANDOFF_20261103_the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit.md`.
This is the DAG half of mock-up C, plus the palette. Shots are in
`docs/sessions/lessons/shots/the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit/`,
taken with `node tests/debug_joint_node_shots.mjs`, which serves this tree's
`apps/` on the real projection.

## What landed

- **The joint is the node.** `VA.nodeJointKinds(topoProj)` in
  `apps/viewer/interface_glyphs.js` is the one place that decides which glyph a
  node gets. A node gets a glyph when it is at an end of an edge whose
  `interface` has one. Both ends of the joint wear it. When a node sits on
  joints of two kinds, the first in `VA.NODE_GLYPH_PRECEDENCE` wins: ball,
  slide, pin, thread, flat faces, clearance. The reasoning is that a joint
  that moves says more about the interface than a seat does. The rule reads
  the edges only, because no node declares an interface word. The glyph is
  drawn at the row pitch (`VA.INTERFACE_GLYPH_PX` = 26 is its design box) in
  the node's own ink, through `rail__node--*` classes that mirror
  `rail__dot--*`. No glyph is drawn on an edge any more. The form-element
  squiggle moved beside its bar, as the node modifier's already was.
- **An edge says only lit or unlit.** It has one ink, `--edge-ink`, and two
  weights, `--edge-lit-w` (4px) and `--edge-unlit-w` (1.5px). A gap is
  dashed. The confidence class is gone from the bar, and so are the derived
  gap's own colour and width (a derived gap is a gap). Hover and selection
  still spend width: hot is 6, lead is 8. The floored-bar break mark stays.
  It only appears in the scaled length modes, and it describes the picture
  rather than the edge.
- **Tints are assigned, not cycled.** `VA.BODY_TINTS` = 16, and a body's tint
  is its index in `bodies[]`. The first six tokens are unchanged, so every
  real row pinned to them keeps its tint. The ten new ones fill the hue gaps
  and are ordered so that neighbouring slots sit far apart. The live model has
  13 bodies, and a `[real]` check fails when it outgrows 16. The assignment
  lives in `topology.css` `:root` (`--tv-body-0..15`) and `VA.bodyTint`.
  `docs/DESIGN_TYPE_AND_COLOUR.md` records this.
- **A body is one container.** `VA.bodyBridges` joins consecutive fields of a
  body with a 4px stroke in the body's tint, and `VA.bodyLabelFields` now
  names a body once whether or not anything is lit. A collapsed body's pills,
  one per block, are drawn into one `g.tv__pill`. The name is on the first
  pill and the bridges sit under them. The row ids `body:base` and
  `body:base#2` stay, because a node id is one row. The pinned test now pins
  the drawing instead.
- **Leaders**: `--leader-ink` was already in place from the hold-still
  handoff. I checked it is present and changed nothing.

## The glyph census (value-level pin)

On the live stops study, the lit nodes draw as 8 ball, 1 slide, 2
clearance and 11 plain (`LIVE_STOPS_GLYPHS` in `apps/viewer/tests.js`). The
handoff's "four balls, one slide, the two stops" counts joints, not nodes.
Each of the four ball joints has two ends, and both are balls. The plate's
slide lights only its plate end. The hub's spindle bore is not in the
study's lit set.

## Where C and the build differ, and why

- **Mock-up C draws a joint as one node; the build draws both of its ends.**
  The topology keeps a joint as a gap edge between two interfaces, so it has
  two nodes, and drawing both is what the data says. Merging them would be
  the 3D pane's "a joint is one node" rule (`coaxial_ends_share_one_3d_node`)
  applied to the 2D walk. That would mean reshaping the walk, which is out of
  scope.
- **The +72° stop is a plain dot, not "flat faces".** Nothing in the data
  states it as `planar`. The mock-up README already calls that drawing a
  reading, not data, and inventing it would break the repo's one rule. The
  blade-root bore stays plain for the same reason.
- **The glyphs are narrower than C's.** C's bars are 20 units wide and its
  slide arrow sits at x = −15. The real DAG's columns are 20px apart, so the
  bars are 16 and the arrow is at −11, to stay inside one gutter. The ball and
  pin rings are C's r7.
- **The lit set is not a single spine.** C draws the study as one chain of
  glyph nodes in chain order. The real DAG keeps the walk's columns and its
  dashed gaps, so the lit set zig-zags across two or three columns. Chain
  order belongs to the grid (the grid handoff), not this one.

## What the click-around found

- Ball and plain dots looked too much alike at r6 against a plain dot of
  r4.5, so the rings went up to C's r7 (`1c_kinematic_zoomed.png`).
- With the edge thinned to 4px, the dashed gaps carry most of the visual
  weight in the lit band. That is the gap channel working as designed, but
  dashed 4px segments look like hashes at the fitted zoom. If Jeff reads them
  as hashes, the next lever is a lighter gap ink (`--edge-gap-ink`), not a
  second channel.
- In the topology view the second block of `base` and of `pitch_plate` is
  no longer named. Its bridge leads up to the first block's name, which may
  be off-screen when the reader is scrolled to the second block. This is the
  price of "named once". A sticky name would be a follow-up if a reader asks
  for it.

## Gotchas

- `.rail__glyph .glyph__solid` never matched anything, because a selector
  cannot reach through a `<use>` to the shadow clone's context. The new shape
  classes (`glyph__ring`, `glyph__solid`, `glyph__line`, `glyph__mask`) are
  styled by class alone. They read the ink as `currentColor` and the fill by
  inheritance from the `<use>`.
- The fast tier's DOM shim has no `insertBefore`. The pill group's bridges
  go in a first-child `g.tv__pillbridges` that is filled once every pill is
  placed.
- **Running `[real]` from a worktree.** Main's projection was built from
  master and refused. Do not rebuild main from a worktree; the guard says why.
  What worked: `dispatch bridge-test-inputs C:/workspace/tolstack .` links the
  declared inputs and the interpreter into the worktree. Then each builder
  runs with `--data-root <worktree>/data`, crops through drawing-checker's
  venv, **from a committed tree** (a dirty tree stamps `dirty: true` and the
  tier refuses it). After that the tiers run with no `--repo`. The guard
  blocked a hand-made junction to main's `data/inbox`, because it reads the
  target as a tracked path. `node_modules` (gitignored) was fine to junction.
- `cat >> /dev/null` at the end of a heredoc command waits on stdin forever.

## Pre-existing reds (not this branch's)

The six `[real]` fast checks that were already red on the base commit were
red here too, measured against the same projection with `apps/viewer` checked
out from the base: the pitch_system grouping, bands, README numbers, forks,
the live-dot part and fixture drift. They are already filed as
`ISSUE_20261103_the_slide_re_author_left_six_viewer_real_checks_red_on_integration.md`.

## Found on arrival

Nothing. The worktree was clean, and the main checkout was on master and
clean. I did not touch it.

## Follow-ups filed

- `docs/issues/ISSUE_20261104_the_3d_scene_does_not_colour_a_body_with_its_dag_tint.md`
  covers the 3D half of "the same tint", which the handoff fenced off as "the
  pane".
- Item 1 of `ISSUE_20261027_design_the_planar_and_clearance_glyphs_read_alike_and_body_names_sit_on_the_rails.md`
  is answered (dated addendum). Item 2 stays open.

## Verification record (2026-11-04)

Everything below ran in **this worktree**. The inputs were bridged, and the
projection was built here from commit `f5234c46` (clean).

- `node apps/viewer/run_tests.cjs`: **629/635**, `[real]` tier armed and
  paired with this tree. The 6 reds are the pre-existing six. They are the
  same 6 on the base code against the same projection.
- `node apps/annotate/run_tests.cjs`: **280/280**.
- `venv-win/Scripts/python.exe -m pytest -q`: **1721 passed, 3 failed, 1
  skipped**, 518 s single-process (no xdist in `venv-win`). Recorded, inside
  budget. The failures:
  - `test_viewer_js_suite`: the 6 pre-existing `[real]` reds above.
  - Two `test_mutation_witness_shadow_concurrency` tests. They were run beside
    my own witness run, which held the repo's lock. Re-run alone with my
    projection moved aside, 3 of 4 pass. The fourth
    (`test_two_different_repo_roots_both_still_succeed`) is the MAX_PATH copy
    failure already filed as
    `ISSUE_20261104_a_lesson_screenshot_name_overflows_max_path_in_the_shadow_concurrency_test.md`.
- `node scripts/run_viewer_browser_tests.mjs --repo <this worktree>`:
  **36/41 suites**, 1362 s. Recorded, inside the merge budget. Each failing
  suite was re-run on the base code against the same projection:
  - `topology file://` and `topology http`: 201/205 on HEAD and on base, the
    same 4 (pitch_system's one-leader-behind pins, already filed). The first
    full run had a fifth red, and it was mine: "every rail on pitch_system has
    a mid-rail point a real pointer can reach". A joint node's target radius
    of 10 left about 3 px of free rail per node row, under the check's 4 px
    scan step. Fixed by shrinking the target to the ring's radius
    (`VA.jointNodeTargetR`, 7 at the comfortable pitch). Re-run: 201/205,
    the same 4 as base.
  - `real render path`, `3D pane follows`, `scene pane reads over HTTP`: they
    fail identically on base. These had no issue, so they are now filed as
    `ISSUE_20261104_three_browser_suites_are_red_on_the_base_with_a_fresh_projection.md`.
- `node scripts/run_mutation_witness_tests.mjs --changed-since integration`:
  26 entries reached. With `--repo .` (which the shadow resolves as itself,
  so `[real]` is skipped) **every non-`[real]` entry is WITNESSED**,
  including all of this branch's new and renamed specs. With the absolute
  `--repo` the `[real]` tier is armed, but it is red before any mutation
  (the six), so the runner skips every entry. The three `[real]` mutations of
  mine were witnessed **by hand** instead. Each was applied in the worktree
  and the fast tier run: the tint count back to 6, the joint-count field, and
  the precedence inversion each reddened their guard. A first draft of the
  live-model spec dropped traced joints. No live gap edge is traced, so that
  mutation changed nothing, and it was replaced by the precedence inversion.

## More gotchas

- `--repo .` on the witness runner is resolved inside the shadow tree, not
  your cwd. Pass the absolute path.
- With a projection under the worktree's own `data/`, every harness that
  spawns the fast tier arms `[real]` (the concurrency tests too). Move it aside
  to measure the tier as a fresh worktree would.
