---
handoff: viewer_dag_hover_cards
date: 2026-09-14
---

# Lessons — viewer_dag_hover_cards

Crop-thumbnail hover cards on the DAG's own surfaces: the edge card on
`.rail__barhit`, a new **node card** on `.rail__dot`.

## The node card's content shape, and why that one

A node is an interface, so the card answers "which parts meet here" — but the
projection carries **two** answers to that and they are not the same fact:

- `node.parts` — the author's own declaration on the node.
- the parts of the edges actually **incident** on the node
  (`VA.nodeAdjacentParts`).

The card shows the **derived** sides and keeps the declared list beside them
(`card.declaredParts`, currently unrendered). Two reasons: the derived
adjacency is what the picture is drawn from — the leader/internal rule reads
exactly it, so a card built on the declared list could say "boundary" about a
dot with no leader — and it is the only one whose sides can be honestly
thumbnailed, because a side's thumbnail is *that part's own component-card
thumbnail* (`VA.componentCard(...).thumbs[0]`). Deriving the picture the same
way twice is what stops the dot and the merged cell disagreeing about what a
part looks like; the `[real]` tier pins that equality across every live node.

Three shapes the sides take, all seen in real data:

- **boundary** — two (or more) parts named, `base plate ⇔ post`.
- **internal** — one part, and the card says "internal to …" rather than
  leaving a one-sided list to read as a missing side. `VA.internalNodes` is
  the predicate, shared with the leaders, not re-derived.
- **a clearance side** — an incident edge with `part: null` (a derived gap) is
  a real side of the interface and is *named* (`VA.CLEARANCE_SIDE_LABEL`), not
  skipped. `pitch_system` has these; the mock's `arm_tip` is the fixture one.

No edge case where a dot's two sides could not be derived: every live node is
incident on at least one edge, so every node gets at least one side. The only
thing that can be missing is a *thumbnail*, and that is the component card's
absent-is-absent rule unchanged.

## One hover surface: the title is absorbed, and one fact had to move with it

Where a card handler exists, a rail mark no longer appends its `<title>` — the
card's own head carries the name. The fallback (no `ctx.onCardShow`, which is
what the fast tier renders by default) still gets the plain title, the same
shape `edgeCropCell`'s `onCropShow` fallback already had.

The one thing a title said that the card had no field for: a **floored** bar's
"drawn at the minimum length, not to scale". That is a fact about the picture,
not about the edge, so `VA.edgeCard` grew an `opts.renderNote` and the words
moved into `VA.FLOORED_RENDER_NOTE`, which `VA.flooredEdgeTitle` now composes
from. Both carriers, one string.

## What I tried, measured, and did NOT ship

**Closing the card when a rail mark is clicked.** It looks obviously right (the
card sits over the diagram; the click is selection; the preview pane persists)
and it is a **visible no-op**: the click re-renders the pane, and the fresh
`<circle>` landing under the unmoved pointer fires `mouseenter` again, so the
card is back before the frame ends. Measured in a browser, not reasoned:
popover `display` stayed `block` across click and re-render. It was written,
tested green, and then reverted rather than shipped as a comment that lies.

The real finding underneath it is filed as
`ISSUE_20260914_dag_hover_card_occludes_the_marks_beneath_it.md` (strategy): a
DAG-side card occludes the marks under it, and nothing closes on pointer-leave
— which is a *landed* decision with its own reasoning in `views/stack.js`'s
`cropTrigger`, so unpicking it is a design call, not a tactical edit. Grid-side
cards have had the same policy since 2026-09-10 without biting, because they
land over the grid's right edge rather than over the thing you click next.

## Four browser-tier traps, all in `hoverRailBar`/`dismissCard` now

Hovering a rail bar in a real browser cost most of this session's test time.
Each of these is encoded in a helper with the measurement in its comment.

1. **`locator.hover()` refuses a rail bar outright.** A vertical `<line>`'s
   bounding box is zero pixels *wide*, and playwright calls a zero-area element
   "not visible". The bar is genuinely hoverable (`pointer-events: stroke` over
   a transparent 14px stroke) — drive `page.mouse.move` to its own coordinates
   instead. `hoverRailBar` is at module scope so the mock and served-mode
   suites share one copy.
2. **Read the rect in ONE round trip.** Resolving a locator and then
   `.evaluate()`-ing against it is two, and under `file://` a late `render()`
   between them handed back a **detached** line whose rect is all zeros — which
   aimed the pointer at (0, 0), the topbar, and then timed out five seconds
   later on a `waitForSelector` that said nothing about why.
3. **`page.mouse.move` does not scroll, and the nav sidebar is sticky.** On the
   real `pitch_system` the target bar's own coordinates landed *on a nav-tree
   row* — the DAG had scrolled horizontally out from under them. The fix is not
   "scroll into view" on its own: it is `elementFromPoint(...) === el` as the
   gate, with `scrollIntoView({block, inline})` only when that fails, so the
   mock's already-clear bars keep the scroll position several checks below
   depend on. The error message now prints what the pointer was actually over —
   that one line is what turned two blind re-runs into a fix.
4. **Dismissing needs the pointer off the trigger FIRST.** `dismissCard()` moves
   to (4, 4) and *then* presses Escape: an Escape sent while the pointer still
   sits on a mark can be undone by the very next paint (the re-render
   mechanism above). Escape alone was flaky, not wrong.

## State of the suites at finish

- fast tier `node apps/viewer/run_tests.cjs` **260/260**; with `--repo
  C:/workspace/tolstack` **314/316**.
- The two reds are **pre-existing and not this handoff's**: `crops.json` in the
  shared `data/` has gained `region_label` / `region_match` and a
  `located_by: "declared_region"`, from the in-flight
  `spec_crop_region_registry` handoff, whose own deliverable 3 names the
  `fixtures.js` key-union and the viewer branch-table updates. Verified by
  running HEAD's `apps/viewer` out of a `git archive` copy against the same
  `--repo`: **307/309, same two failures**. Do not "fix" them here.
- browser tier `node scripts/run_viewer_browser_tests.mjs --repo
  C:/workspace/tolstack` **16/16**: topology **128/128** in both modes (118
  before) and served mode **14/14** (11 before) — the served-mode additions are
  the DoD's own sentence on the real graph, a `pitch_system` bar's card equal
  to its grid trigger's, and a real boundary dot naming both its parts.
- `pytest -q` 815 passed, 1 skipped.

One unexplained one-off on the way: `topology file://` hung 30s on a nav-row
click in the real-data study loop, in a block that opens no cards, while
`topology http` ran it clean in the same process and the next full run was
16/16. Filed as
`ISSUE_20260914_topology_file_url_real_study_loop_hung_once.md` (low) with the
verbatim log rather than left in this file, where nothing schedules anyone to
read it.

## Environment

`node_modules/` is per-worktree and gitignored — `PLAYWRIGHT_SKIP_BROWSER_
DOWNLOAD=1 npm install` in the worktree root before the browser tier, or the
runner dies with `ERR_MODULE_NOT_FOUND: playwright-core`. That is now in at
least three lessons; it bit again.
