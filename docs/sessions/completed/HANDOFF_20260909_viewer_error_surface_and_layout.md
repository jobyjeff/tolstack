---
priority: high
depends_on: []
---

# HANDOFF 2026-09-09 — viewer_error_surface_and_layout: render failures must self-report; full-page scroll; whole-edge hover

Source: 2026-09-09 live incident + Jeff's same-day feedback on the topology
viewer. The incident: a stale browser-cached `views/stack.js` made `render()`
throw `TypeError: VA.jointBlock is not a function` (`views/topology.js:88` →
`topology_app.js:458`) and the page showed a silently empty DAG pane with a
no-op Reload — because `topology_app.js:404`'s
`onReload: function () { load().then(render); }` has no `.catch`, and the boot
path's final `.then(render)` (~line 140) is equally unguarded. The
served-side cache fix is drawing-checker's (`tolstack_mount_cache_control`,
staged there); THIS handoff makes the viewer tell the user when this class
happens again. Baseline: integration tip (`af8e149` or later — the 2026-09-09
viewer-test fixes are there; worktrees cut from integration per the two-trunk
model).

Scope: `apps/viewer/` + its test tiers (`apps/viewer/run_tests.cjs` suite,
`scripts/run_viewer_browser_tests.mjs`). Do NOT touch `apps/annotate/`,
`scripts/build_*.py`, or `docs/topologies/`.

## Deliverables

1. **Errors surface in the banner.** `onReload` gets the same
   `.catch(err => …).then(render)` shape `gesture()` (~line 507) already has;
   the boot path gets equivalent protection; and a throw from *inside*
   `render()` itself is caught at one seam and rendered as a banner-level
   error state (plain words + the exception message + "hard-reload
   (Ctrl+Shift+R) may clear a stale cache" hint — that is the observed cause).
   One error seam, not try/catch sprinkled per view. A failed reload must
   never leave the page silently unchanged.
2. **Full-page scroll (Jeff, verbatim intent):** remove the DAG pane's own
   scrollable panel entirely — the document scrolls as one page, and the only
   independent scroll region left is the left nav sidebar. Mind the existing
   height-budget browser tests (`[height budget]` tier, 5 assertions) — they
   encode the old inner-scroll layout and must be updated to pin the NEW
   contract (nav scrolls independently; DAG contributes its full height to the
   document), not deleted. While in the scroll CSS: **style the scrollbars to
   match the theme** (Jeff, 2026-09-09: "plain/out of style") — the remaining
   scroll regions (left nav, any overflow panes) get themed scrollbars
   (`scrollbar-color`/`scrollbar-width`, plus the `::-webkit-scrollbar` pair
   for Chromium) consistent with the page's dark palette.
3. **Whole-edge hover target.** Currently only a short portion of a long edge
   responds to mouse-over. Standard SVG fix (suggestion, not binding): a
   duplicate invisible path per edge (`stroke: transparent`, stroke-width
   ~12–16px, `pointer-events: stroke`) carrying the hover/tooltip handlers, so
   the entire drawn length of every edge — including long ones — shows the
   edge description on hover. Keep the visible stroke untouched.
4. **Experimental node/edge display mode (view setting, default OFF).** Jeff's
   observation (2026-09-09, near-verbatim): compared to a typical Excel stack
   the view has ~2× the rows, because a spreadsheet lists only the
   dimensions/tolerances BETWEEN interfaces — the nodes themselves ("top hub
   bearing flange") aren't rows, which is why half our rows carry no values.
   The mode: **labels only on node rows; edge rows show values only, no
   label** (an edge label is just the concatenation of its adjacent node
   labels anyway). Mousing over a value-only edge row shows the description —
   ride the whole-edge hover machinery from item 3 (one hover surface, not
   two). "Utilize the empty space to convey meaning." Ship it as a toggle in
   the view settings so Jeff can play with it and we can disable it later;
   both modes must render against the real projections. (Future extension —
   hover shows interface crop thumbnails, both sides — lives in the strategy
   draft, not here.)
5. **Cover the real-data render path.** The incident was invisible to every
   tier because nothing renders the real projections: the browser tier injects
   mock `{topologies, crops}` and never supplies `results.json`. Add a tier
   (or extend the node tier) that loads the REAL three JSONs from the main
   checkout (`C:\workspace\tolstack\data\projections\viewer\{topologies,results,crops}.json`
   — absolute path; a worktree has no `data/`) through the actual
   `load()`+`render()` pipeline and asserts the DAG populated (non-zero
   rendered rows/nodes for every topology). A scratch prototype of exactly
   this exists from the incident debug — untracked
   `tests/debug_topology_real_render.mjs` in the main checkout; promote or
   rewrite it as a maintained test with a skip-with-reason when the
   projections are absent (fresh clone).

## Definition of done

- Seeded-failure test: with a render function forced to throw (test seam), the
  banner shows the error state — pinned in the browser tier, value-level on
  the rendered text.
- Layout: height-budget tier updated and green under the new one-page-scroll
  contract; a browser-tier assertion that hovering the far end of the longest
  real/fixture edge produces the tooltip.
- Real-data tier green against the main checkout's projections (all 5
  topologies render; pin the count at whatever the projection carries with a
  clear re-pin note).
- Full JS suite + pytest green.
- Lesson (`docs/sessions/lessons/LESSONS_20260909_viewer_error_surface_and_layout.md`):
  the error-seam placement chosen, what the height-budget contract now pins,
  and any hover-hitbox interactions with the inline edge crops.
