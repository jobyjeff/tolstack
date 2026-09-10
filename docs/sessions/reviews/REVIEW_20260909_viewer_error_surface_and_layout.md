---
type: review
handoff: docs/sessions/active/HANDOFF_20260909_viewer_error_surface_and_layout.md
reviewer: agent
date: 2026-09-09
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-09 — viewer_error_surface_and_layout

## Scope

This is a viewer UI/error-handling handoff, not a tolerance-stack authoring one:
`apps/viewer/` (error seam, full-page scroll, whole-edge hover, an experimental
edge-value-only row mode) plus its two test tiers. No new stack/topology data,
no `source_ref`, no LMC/MMC, no cotter hardware, no traced ratio — the
mandatory tolerance-stack checklist (checks 1-7) does not apply; this note
satisfies "explicitly addressed" for those by recording why. Confirmed the
diff touches only `apps/viewer/*`, `scripts/run_viewer_browser_tests.mjs`, and
the lesson file — none of the excluded `apps/annotate/`, `scripts/build_*.py`,
`docs/topologies/`.

## What I verified

- Read the handoff and the repo overlay's viewer-specific entries (browser
  truth tier for any CSS/layout diff; no-second-combiner extends to JS; total
  functions over `else if` chains; qualitative viewport claims need their own
  measurement).
- The review branch already carried commit `ab3c238` (deliverable work) from a
  prior pass; merged the remaining `6f071d7` (topology_fixtures.js `checks: []`
  fixture-drift patch) — fast-forward, no conflicts, so there was no
  merge-conflict resolution to make or report.
- Full suite green: pytest **751 passed, 1 skipped**; node tier (mock only)
  **170/170 passed**; browser truth tier against the real main-checkout
  projections (`--repo C:/workspace/tolstack`, after `npm install` for
  `playwright-core` in this worktree) **11/11 browser checks passed**,
  including the two new tiers this handoff adds (`render crash shows the
  banner` 4/4, `real render path (non-mock)` 6/6).
- **Verified each new guard actually has teeth** (universal check — a check is
  not trusted on green alone):
  - Removed `render()`'s `try`/`catch` around `paint()` → `testRenderCrash`
    correctly timed out waiting for `.banner--crash` and reported the seeded
    error as an uncaught page error. Reverted; suite green again.
  - Set `.rail__barhit`'s `pointer-events` from `stroke` to `none` (simulating
    the pre-fix "only the visible dash responds" bug) →
    the whole-edge-hover sub-check in `testTheTopologyPage` correctly failed
    (88/89, both `file://` and `http`). Reverted; suite green again.
- Read every changed file in full against the four numbered deliverables:
  - **Deliverable 1 (error seam).** `render()` (`topology_app.js`) now wraps
    the real paint in one `try`/`catch` and calls `VA.renderCrashBanner`
    (`views/banner.js`) on a throw. Confirmed by grep that `boot()`'s
    `adapter.init()` chain, `onReload`, and `gesture()` all end
    `.catch(err => state.error = ...).then(render)` — one shape, three call
    sites, matching the handoff's "one seam, not try/catch per view."
  - **Deliverable 2 (full-page scroll + themed scrollbars).** `.tv__scroll`
    lost its own `overflow`/height cap; `.navtree` is the one region still
    `position: sticky` + `max-height` + `overflow-y: auto`. The lesson records
    a genuine regression caught and fixed mid-session (losing `.tv__scroll`'s
    vertical clip also silently lost its pre-existing *horizontal* clip, via
    the CSS spec rule that a scroll container's flex-basis content
    contribution is zero on one axis if the other is `auto`) — `.tv__hscroll`
    with `height: max-content` is the fix, and it is walled off from the
    vertical axis correctly. Scrollbar theming
    (`scrollbar-color`/`scrollbar-width` + the `::-webkit-scrollbar` pseudo
    quartet) is set once at `html`/`*`, inherited everywhere, matches the
    dark palette's own custom properties (checked `--muted`/`--panel2`/
    `--line` all exist).
  - **Deliverable 3 (whole-edge hover).** `.rail__barhit`, a second invisible
    `stroke-width: 14` line per edge with `pointer-events: stroke`, carries
    the hover title and click handler; the visible bar is untouched. Verified
    with the negative test above that this is load-bearing, not decorative.
  - **Deliverable 4 (edge-value-only toggle).** Default `false`
    (`state.edgeValueOnly`), a third toolbar button, persists across
    topology/study switches the same way `rowDensity` already does (documented
    as deliberate, matches existing convention). Hides only the edge row's own
    label (never a node row's, never a `missing()` diagnostic row) and moves
    the same text to the row's native `title` — one hover surface shared with
    deliverable 3's `VA.edgeHoverTitle`, not two. Node-tier tests cover the
    toggle's presence, its click wiring, and the label/title swap including
    the "broken edge id" edge case.
  - **Deliverable 5 (real-data render path).** `testRealDataRenderPath` swaps
    `VA.FsaAdapter` for a fake `MemoryAdapter` and calls the real
    `VA.bootTopology()` with no `?mock=1`, asserting zero unhandled promise
    rejections and, per real topology, `rows === nodes.length + edges.length`
    (computed from the live projection, not a restated literal). Confirmed
    this is what caught the `topology_fixtures.js` `checks: []` drift the
    lesson describes (a real, if fixture-only, defect this same deliverable's
    tier found and the author patched in `6f071d7`).
- Grepped the diff for arithmetic on projection fields (the "no second
  combiner extends to JS" entry): none in `apps/viewer/`. The
  `y1`/`y2` pixel-geometry lines in `railsSvg` and the row-count arithmetic in
  `run_viewer_browser_tests.mjs` are SVG/test-geometry, not tolerance values —
  the documented false-positive shape, same as the existing popover-clamp note.
- README (`apps/viewer/README.md`) updates read accurately against the code:
  the retired "majority of the viewport" claim, the new full-page-scroll
  contract, the `.tv__hscroll` axis split, the error seam, and the two
  deliverable-3/4 features are all described in a way that matches what the
  diff actually does.
- Confirmed the review worktree and the main checkout's `data/` are both
  clean after the browser-tier run (no stray run output).

## Findings

None. No blockers, no should-fix, no nits.

## Overlay

The existing overlay already covers this handoff's failure classes precisely
(browser truth tier for CSS/layout, no-second-combiner in JS, qualitative
viewport claims). Nothing new surfaced this review to add, and nothing here
was stale enough to prune.

## Verdict

**APPROVE.** Merged `handoff/viewer_error_surface_and_layout` into
`integration` (fast-forward) and pushed.
