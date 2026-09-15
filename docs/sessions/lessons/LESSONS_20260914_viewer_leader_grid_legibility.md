---
handoff: viewer_leader_grid_legibility
date: 2026-09-14
---

# Lessons — viewer_leader_grid_legibility

## The tint values, and why they cannot collide with provenance

`--tv-band-a: rgba(255, 255, 255, .017)` and `--tv-band-b: rgba(255, 255, 255,
.055)` (topology.css `:root`).

They are **pure white overlays**: R = G = B, so neither has a hue at all.
That is the whole argument — the page's hard constraint is that green, amber,
red and magenta are provenance and nothing else may wear them, and a colour
with no hue cannot be mistaken for one that has one, at any alpha. It is also
the same move the rails already make (two greys by column parity), so the page
gains no new colour concept. A white overlay additionally composites
identically over the page background, over a provenance row tint and over the
hover tint, which a pair of opaque greys would not.

The alphas are near the floor of visible on purpose: a band has to be findable
while the eye is *tracking* it and invisible while the eye is *reading a value
beside it*. `.055` against `.017` is roughly the smallest pair that survives a
1700px screenshot; anything stronger turns a 43-row grid into a barcode and
starts competing with the untraced row tint, which is itself only `.1`.

## The thing that nearly shipped wrong: the row tint lost to provenance

First cut gave the band tint to `background` on `.tvrow--band-a/b` and let the
more specific `.tvrow--edge.conf--untraced { background: … }` win, with a
comment explaining that provenance outranks wayfinding. It reads fine on the
demo fixture — and it is nearly **inert on the document the handoff exists
for**: 20 of `pitch_system`'s 24 rows are `untraced`, so 20 of them would have
shown no band at all. Jeff would have opened the page he complained about and
seen four tinted rows.

The fix is to make them **layer** rather than compete: the band is the row's
`background-color`, a provenance tint is a `background-image` (a flat two-stop
`linear-gradient` is the only way CSS spells "an image of one colour"). Both
paint. `.tvrow:hover` had to become `background-color` too, or hovering a row
wiped its provenance layer off.

**The general lesson:** the fixture's confidence mix is not the real
projection's. `demo_mechanism` is mostly traced; `pitch_system` is 20/24
untraced. Any rule whose *visibility* depends on a row's confidence has to be
checked against the real projection, and the browser tier's `[real]` block is
where that check belongs — it is what caught this (`tinted > 10` failing at
`tinted === 4`).

## Leaders cross each other, and they have since 2026-09-14 morning

`VA.leaderGeometry` carried a comment saying leaders **cannot** cross, with a
proof: monotone lanes plus monotone endpoint sequences. The proof was sound and
its premise died four days later. `viewer_leader_line_grid`'s lesson states the
premise outright — *"Leaders always rise left-to-right (`y2 < y1`
structurally)"* — and `viewer_dag_spine_layout`'s centring is what ended it
(its own lesson says "a leader can now point DOWNHILL" and changed the browser
tier's endpoint measurement because of it). Nobody re-checked the crossing
proof that the same change invalidated.

Two leaders cross exactly when `y2[i] >= y1[i+1]`. On the live `pitch_system`
that is 16 pairs out of 16 leaders. Filed as
`ISSUE_20260914_leaders_cross_each_other_since_the_grid_was_centred.md`
(`audience: strategy`, four candidate fixes, all of them layout policy), and
the comment in `topology.js` is corrected rather than left standing.

**This cost real design work**, because it is what the bands have to survive.
"The region between two adjacent leaders" is only a simple region while the
leaders behave; drawn literally it folds over itself and its `fill` doubles
where it overlaps its neighbour — a visible three-level checkerboard right in
the zone that was supposed to get more legible. So a band boundary is a
**running maximum** of the leaders (`boundary_k = max(leader_k,
boundary_{k-1})`, pointwise in x, with piecewise-linear crossings inserted
exactly). The bands then tile the pane with no overlap and no gap, and a
boundary still *is* its own leader everywhere the leaders behave. Where they
do not, the band pinches to zero height, which is honest about what is
happening underneath.

If the issue above is ever fixed, `maxProfile` becomes a no-op and could be
deleted — the `[real]` test asserting the crossings are still there says so in
its own failure message.

## What persistence the two resize preferences got: none beyond the session

Both are plain in-session state, like `rowDensity`, `edgeValueOnly` and
`edgeLengthMode` before them. Nothing on this page persists across a reload,
and the page is opened from `file://` at least as often as it is served (where
`localStorage` is per-file-path at best and a throw at worst). One preference
that outlived a reload while four others did not would be the surprise, not the
feature. Switching *topology* keeps both, which is what the handoff actually
required, and the browser tier's `[real]` block pins it.

The jog zone is held as a **multiple of its natural width**, not a pixel width,
and that is load-bearing for exactly that reason: `pitch_link_to_pitch_plate`
has 5 leaders and `pitch_system` has 16, so their natural zones differ by ~3×.
"Twice as spread out as it would be" survives the switch; "340px" would
collapse one and explode the other.

## Gotchas that cost time or would have

- **A re-render during a drag destroys the node the drag started on.** Both
  listeners therefore live on `document` (never `setPointerCapture` on the
  grip), and the delta is applied to a value **snapshotted at pointerdown** —
  reading the live value per move compounds every frame into a runaway. The
  keyboard path has the same bug in a different shape: `render()` replaces the
  grip, focus falls back to `<body>`, and the *second* arrow press goes
  nowhere. It looked like the control was broken after one nudge. `onResizeNudge`
  re-focuses by `[data-resize="…"]` after the render.
- **`_classSet()` is a DOM-shim-only method** and this suite runs in a real
  browser too (`test.html`). Reading classes portably needs
  `getAttribute("class")` **first** (an SVG node's `className` is a read-only
  `SVGAnimatedString`) with a fall back to `className` (the shim never syncs
  `className` into the attribute). `hasClass()` in tests.js is that, once.
- **CRLF, again, and a new way in.** The working tree is CRLF. A patch script
  that reads with `newline=""` and inserts LF-terminated text leaves a file
  with *mixed* endings and `git diff` shows nothing wrong. The scratch helper
  used for the rest of this session normalises to LF, patches, and writes back
  in the file's original ending; the first insert was done before that existed
  and had to be re-normalised.
- **`playwright-core` does not resolve from a worktree**: `node_modules` lives
  only in the main checkout and ESM resolution walks up from the *script's*
  directory, which never reaches it. `cmd //c "mklink /J node_modules
  C:\\workspace\\tolstack\\node_modules"` from the worktree root fixes it (the
  junction is gitignored). **Remove it before you finish** — a junction into
  the main checkout means a recursive delete of the worktree could take the
  main checkout's `node_modules` with it. Also pass `{ channel: "chrome" }` to
  `chromium.launch()`: there is no downloaded playwright browser on this
  machine, which is exactly what `run_viewer_browser_tests.mjs`'s own `launch()`
  already does.
- **A scratch `.mjs` in `scripts/` fails pytest, not the JS suite.**
  `tests/test_architecture_inventory.py` pairs the directory listing against
  ARCHITECTURE.md's inventory block, so three throwaway screenshot scripts made
  the Python suite red with a message about the inventory. Put scratch scripts
  anywhere else, or delete them before running pytest.
- **Mutation-test the wiring, don't trust the count.** Eight one-line reverts of
  the eight call sites, run one at a time: seven died immediately, and the
  band-clamp one **survived** because the demo mechanism's leaders only *touch*
  rather than cross. The mock fixture needed its `gridOffset` pushed one step
  past what its own centring produces (modelling `pitch_system`, which the
  `[real]` tier then checks for real) before the test could see the defect it
  was written for.

## Verified

- `node apps/viewer/run_tests.cjs`: 267/267 (worktree, mock tier only).
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 322/324. The
  two reds are not this branch's: extracting today's `integration` to a scratch
  tree (`git archive integration | tar -x`) and running the same command there
  gives 312/314 with **the same two** — `crops.json` gaining
  `region_label`/`region_match`, and `located_by = "declared_region"` having no
  viewer branch. Both are shared-`data/` drift owned by other branches.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`:
  16/16 suites, topology page 143/143 sub-checks over `file://` and http.
- `venv-win/Scripts/python.exe -m pytest -q`: 815 passed, 1 skipped.
