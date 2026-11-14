---
priority: high
depends_on: [a_feature_is_bound_once_to_a_set_of_faces]
model: opus
hitl: false
---

# HANDOFF 2026-11-12 — the_page_is_a_fixed_layout_and_nothing_scrolls_the_document: tree, 3D, DAG and grid each own a region with its own scroll, and one control shows 3D and DAG side by side or either alone

Source: Jeff's note `20261109T222516_f7jdsi` (2026-11-09), the layout he asked
for, restated below; and his note `20261112T114449_f3anmp` (2026-11-12): "does
it make sense to have the 2d and 3d canvas be either/or rather than displayed
side by side? … Could consider making the 3d canvas into a tabbed view where you
switch between 2d/3d, though I'm not sure I want to get rid of the side-by-side
just yet." This is step F1c of the plan in
`dispatch/docs/strategy/drafts/DRAFT_tolerance_analysis_over_the_kinematic_model.md`.
Strategy record: `dispatch/docs/strategy/HANDOFF_20261112_strategy.md`.

Baseline: `integration` after `a_feature_is_bound_once_to_a_set_of_faces`. Read
the lessons of the highlight handoff
(`hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque`:
select scrolls a lit row into view — that must keep working inside the new
scroll regions) and of F1b. Line numbers below were read on `master` on
2026-11-09/12; function names are the anchors. Scope: `apps/viewer/` (the shell,
styles, `views/topology.js`, `topology_app.js`), `apps/annotate/` only as far as
the pane's size, `scripts/run_viewer_browser_tests.mjs` (the layout suites),
docs, tests. Do NOT change what the DAG draws or how it is laid out inside its
region (the map is a later handoff), the highlight rule, or bindings.

## The layout (Jeff's, 2026-11-09)

- Left: the title and the model picker above the tree; the tree scrolls by
  itself.
- Middle: the 3D pane and the DAG **start at the top of the window**; the DAG is
  full height with its own scroll.
- Right of them: the settings bar, then the grid, then the preview, stacked. The
  grid's horizontal scrollbar sits directly under the grid; the preview has its
  own vertical scroll.
- The Contribution column is narrow; every grid column can be resized.
- **Nothing scrolls the document** at 3840×2160 or at 5120×2160.

## Deliverables

1. **The fixed shell**, as above, for every model and every study page that uses
   the shell. Region sizes are draggable at the seams and remembered.
2. **One control, three states: side by side · 3D · DAG.** Side by side is the
   default (Jeff is not ready to give it up). "3D" gives the pane the DAG's
   region too; "DAG" gives the DAG the pane's. The choice is remembered and is
   in the URL. Highlight and selection behave the same in all three; with one
   surface hidden the other three still light. This is the experiment Jeff asked
   about — the lesson says how each state reads at both monitor sizes so he can
   decide whether tabs should become the default once the DAG is a map.
3. **The traps, each dealt with and named in the lesson:**
   - the browser check that asserts the document-scroll model
     (`scripts/run_viewer_browser_tests.mjs:3797-3877`) is **rewritten** for the
     region model, not worked round;
   - the unreachable "bounded pane" branch (eight sites — grep the term) is
     either the implementation or deleted;
   - with a real scroll container the JS header pin (`views/topology.js:1476`)
     goes, and the grid header is pinned by CSS;
   - three comments still describe a layout that left on 2026-10-26 — remove or
     correct them;
   - `docs/issues/ISSUE_20261112_at_3840_the_3d_pane_is_a_narrow_strip_under_the_sweep_bar.md`
     is this handoff's: the pane's region is sized by the shell, and its top bar
     does not take the pane's width from it.
4. **Leaders**, if switched on, still land on their rows inside the scrolled
   regions, or the control says they are unavailable in that state — whichever
   is true after this change; do not leave them drawing to the wrong place.

## Definition of done

- At 3840×2160 and 5120×2160, on v2 and on v1: `document.scrollingElement`
  reports no vertical or horizontal overflow (state the measured numbers); each
  region scrolls alone. Shots of all three states of the control at both sizes,
  each looked at, in `docs/sessions/lessons/shots/<slug>/`. One more at
  1920×1080 so a laptop is not broken.
- A selection made in the tree scrolls its grid row and its DAG node into view
  inside their own regions (filmstrip).
- The exploratory click-around the repo requires: resize every seam, resize a
  grid column, switch models, open a study page.
- Tests: the rewritten layout suite; default `pytest -q` once; the two fast node
  tiers; the browser runner with `--only` for each suite added or changed; the
  witness runner with `--only` for each spec added or changed.
- Lesson (`docs/sessions/lessons/LESSONS_20261112_the_page_is_a_fixed_layout_and_nothing_scrolls_the_document.md`):
  the measured overflow numbers; what became of each trap; how the three states
  read; the region the map handoff will have to draw in, in pixels at both
  sizes and in each state.
