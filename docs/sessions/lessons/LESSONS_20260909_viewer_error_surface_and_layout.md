---
handoff: viewer_error_surface_and_layout
date: 2026-09-09
---

# Lessons — viewer_error_surface_and_layout

## Recovered from a died mid-session

This session's worktree already carried substantial uncommitted WIP for all
five deliverables when picked up (a prior session died mid-run, no commits on
the branch). The survey found the implementation itself essentially complete
and well-reasoned — every file had comments explaining the "why" against this
handoff's deliverable numbers. What was missing, and what this session's
actual work was:

1. one broken node-tier test (toolbar button count assumed 2, deliverable 4
   added a third),
2. zero test coverage at any tier for deliverable 4 (the edge-value-only
   toggle existed and rendered correctly, but nothing asserted it),
3. a real, user-facing regression in the full-page-scroll change (below),
4. stale README prose describing the *retired* "DAG pane is the majority of
   the viewport" contract instead of the new one.

None of this was visible from `git log` — it was all sitting in the working
tree. **Lesson for future recovery sessions:** run the full test matrix
first, before reading diffs top to bottom; it immediately surfaced (1), and a
`grep` for the new toggle's identifiers across both test files immediately
surfaced (2). Diff-reading alone would not have caught (3) — that needed an
actual browser run.

## The error seam (deliverable 1)

`render()` in `topology_app.js` now wraps the real paint in one `try`/`catch`;
a throw renders `VA.renderCrashBanner` (banner.js) instead of leaving the page
as it was. `onReload` and the boot chain both got the `.catch(err => state.
error = …).then(render)` shape `gesture()` already had. This is the *whole*
seam — no view has its own `try`/`catch`. Pinned in the browser tier only
(`testRenderCrash`, forces `VA.renderTopoPane` to throw); the DoD asks for
value-level assertions on the rendered text there specifically, not at the
node tier, since the point is proving nothing escapes as an uncaught page
error, which the node-tier DOM shim cannot observe.

## The real regression: full-page scroll broke the grid's horizontal scroll

`.tv__scroll` losing its own `overflow: auto` (the point of deliverable 2)
also silently lost the pane's **horizontal** clipping, which was never in
scope to touch — the grid's columns (`COLUMNS`, `views/topology.js`) sum to
~1088px, always wider than a typical pane, and `.tv__rails`'s own `position:
sticky; left: 0` (so the rail column stays visible while the grid scrolls
sideways) depends entirely on having a scrolling ancestor to stick within.
With none, the grid's wide rows painted straight through into the `.detail`
pane's column — invisibly, since `.detail`'s opaque background sat on top of
them in paint order — and any click on a scrolled-right cell (the browser
tier's crop-trigger check for `base_thickness`) hit `.detail` instead. Only a
real browser run caught this; the node-tier DOM shim has no layout engine.

The fix (`.tv__hscroll`, wrapping just the header + body, `views/topology.js`
+ `topology.css`) is not simply "add `overflow-x: auto`" — that alone
reintroduces the exact bug deliverable 2 retires, and via a genuinely subtle
mechanism worth recording: **`overflow-x` and `overflow-y` are not
independent**. Per the CSS Overflow spec, if one axis is `visible` and the
other is not, the browser silently computes the `visible` one as `auto`
instead — so `overflow-x: auto` alone makes `.tv__hscroll` a real (if
usually inert) scroll container on **both** axes. That matters inside a flex
column: a flex item's automatic minimum size (used when siblings compete for
space) is normally content-based, but for a **scroll container** it is
defined as `0` — so `.tv__scroll` (the actual flex item, one level up)
stopped reporting a real minimum height, and the flexbox algorithm happily
compressed `.tv__hscroll` down to whatever leftover space it had, recreating
an inner vertical scrollport. `height: max-content` on `.tv__hscroll` is
what breaks that: it fixes the box's own height to its content regardless of
the flex distribution above it, so the scroll-container-zero-min-size rule
never gets a chance to bite. Confirmed empirically (not just reasoned about)
with a throwaway Playwright script measuring `scrollHeight`/`clientHeight`
before trusting the fix, then re-ran the full browser tier with `--repo` for
the real `pitch_system` (43 rows) to prove the document — not the pane —
grows.

**If a future change touches `.tv__scroll`, `.tv__hscroll`, or `.tv__main`'s
flex column again: re-run the browser tier, not just the node tier.** This
class of bug is invisible without an actual layout engine.

## Hover-hitbox interactions with inline edge crops

None found, and none expected: the whole-edge hover surface
(`.rail__barhit`, deliverable 3) lives entirely on the SVG rail marks; the
crop-trigger buttons and their popovers live in the grid's table cells — a
disjoint set of DOM nodes in a different pane of the layout. Deliverable 4's
edge-value-only mode reads the same `VA.edgeHoverTitle` text but sets it via
the table row's native `title` attribute, again independent of the SVG. No
element carries two of these hover mechanisms at once.

## What the height-budget tier now pins

`testHeightBudget` (`scripts/run_viewer_browser_tests.mjs`) no longer checks
"the pane is more than half the viewport" (that contract is retired). It now
asserts, for both mock and real data: `.tv__scroll`'s own `overflow-y` is
never `auto`/`scroll`; its rendered height is never less than its own row
count demands; and — real data only, since the mock fixture is too small to
force it — the *document's* `scrollHeight` exceeds the viewport, proving
growth reached the page. The left nav's `position: sticky` +
`overflow-y: auto` is asserted as the one remaining independent scrollport.

## A second crash, a second recovery: fixture drift the DoD's own new tier caught

This handoff's branch itself crashed mid-flight after the work above landed
in commit `ab3c238` (working tree was clean, everything committed — nothing
lost, just an unreported session end). Picking back up, `git status` was
clean and every deliverable's commit message read complete, so the check was
to actually run the full matrix with `--repo <main checkout>` rather than
trust the message.

That surfaced one real failure: `[real] the topology fixture's shapes still
match the builder's` (added by deliverable 5's new drift-detection test,
`tests.js`, "the topology fixture's shapes still match the builder's").
`apps/viewer/topology_fixtures.js`'s three demo studies were missing
`checks: []` — a field `project_study()` gained in `391dc7c` (topology_
projection_emits_study_checks, merged into this branch's ancestry via
`integration` before this handoff even started, so the drift predates this
session and this handoff's own changes). Nothing had ever run the fixture
against the live builder's shape before deliverable 5's new real-data tier,
so nothing had caught it. Patched the same way the header already documents
for `joint`/`worksheet_file`/`worksheet_source`/`configuration` (the demo
mechanism's source documents no longer exist to re-run the builder over, so
hand-adding the honest empty value is the legitimate fix, not a shortcut) —
added a fourth paragraph to the fixture's header recording it. **Lesson:**
`git status` clean and a prior commit message claiming "green" is not
evidence the full matrix (`--repo <main checkout>` specifically) has been run
since — the fast in-worktree tier alone will not touch this class of drift at
all, since it never sees the main checkout's live projections.

## Test-tier note

`node_modules/` (hence `playwright-core`) is gitignored and did not exist in
this worktree; `npm install` was needed before the browser tier could run at
all. Worth remembering for any future worktree touching `scripts/run_viewer_
browser_tests.mjs` — the main checkout already has it, but a worktree does
not inherit it.
