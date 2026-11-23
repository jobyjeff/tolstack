---
priority: high
depends_on: [the_walk_reads_the_v2_study_and_the_map_on_the_merged_page]
model: opus
hitl: false
---

# HANDOFF 2026-11-22 — the_tree_sits_beside_the_3d_canvas_and_holds_still: the structure tree shows only with the 3D pane, keeps its place through every redraw, and reads as a hierarchy

Source: Jeff, 2026-11-22, three messages (note `20261122T211136_iubdsx` and
chat), and the sketch he said yes to. First of a chain of four (this, then
`editing_a_feature_opens_its_form_where_the_tree_was`, then
`right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays`,
then `the_walk_binds_through_the_form_on_the_merged_page`).

Jeff's words this handoff answers:

> The way the menu jumps to a different scroll position is very jarring and
> disorienting, because the there's very little contrast between different
> layers/objects etc, so when it redraws and moves you lose your visual
> reference and it feels like the entire menu might as well have been
> replaced by something totally different until you figure out what you're
> looking at again. Having any element that gets expanded/collapsed get
> pinned to the same location during the redraw would help. Adding animations
> to show the elements collapsing/opening would help. Again more visual
> hierarchy, outlines around elements, deeper indents, font
> size/color/boldness etc so that it doesn't just look like a homogenous wall
> of text. I feel like I keep asking for the same things over and over again
> and it is improving, but very gradually/marginally with each pass.

> It seems like the structure view is only used when the 3d canvas is active,
> should we just make it part of that canvas (or only visible when the 3d
> view is active)?

> The green circles/triangles seem confusing/inconsistent.

**The sketch**: `C:\workspace\dispatch\docs\strategy\drafts\mockups\tolstack_binding_pane_20261122\index.html`
(open it from disk and click through it) and the `README.md` beside it, whose
table of rules binds this chain. It is a layout and a behaviour, not a visual
design.

Baseline: trunk with everything ahead merged. Scope: the shell's tree
(`apps/viewer/views/nav.js`, `apps/viewer/topology_app.js`'s render and tree
paths, `apps/viewer/model.js`'s listing, `apps/viewer/identity_fold.js` for
deliverable 6, `apps/viewer/topology.css`), their tests,
`docs/ANNOTATION_SURFACE.md` where it describes the tree. Do NOT touch: how a
face is picked or a binding is written (`apps/annotate/app.js`'s pick and
write paths, `binding_state.js`): the next link replaces them, and until it
lands the buttons a feature's body carries today (Correct, Add a face,
Unbind, Remove) **stay and keep working**. Do not touch the map, the grid or
the study views. Never write to
`C:\workspace\tolstack\data\inbox\feature-identity\`.

## Why seven earlier handoffs moved this only a little (measured 2026-11-22; line numbers are "about", re-check)

- The tree is torn down and rebuilt whole (`views/nav.js:626-627`, from
  `renderNav`, `topology_app.js:3433`) on every `render()` (:3080), fold
  toggle (:1037), filter (:988), visibility box (:1078), pane open or close
  (:1905, :303) and every pane write (:2288); bodies rebuild again on each
  `annotate:tree` message (:2028-2030, :2187).
- Nothing saves or restores the tree's scroll. The only scroll write is
  `revealLitRows` (:2305-2331) on selection; a `.focus()` at :2211 has no
  `preventScroll`. **No test pins the tree's scroll.** One did:
  `the_rail_holds_still…` (2026-11-05) added a scroll guard, and
  `the_model_is_derived_once…` (2026-11-10) rebuilt the column without it;
  the guards `a-take-keeps-the-nav-s-scroll` and
  `each-level-of-the-tree-steps-in` were renamed away.
- Heights change under the pointer: a selection opens every fold on each lit
  row's path and leaves them open (`nav.js:699-710`); the selected feature's
  body opens and the previous one closes (`nav.js:412`).
- Hierarchy today (`topology.css`): indent 16 px then 14 px a level (:195,
  :304), a body 22 px more (:311); every row 13 px; a body row is weight
  600; part, joint, interface and feature rows are identical (:281); a group
  label is 11 px uppercase muted (:280); no outline or background per level.
- Marks: a body has a 9 px square in its body colour; a feature has an 8 px
  circle, solid green bound, blue ring suggested, nothing otherwise
  (`nav.js:203`, `:396`; `topology.css:294-299`; status from
  `model.js:105-111`); part, joint, interface and group rows have none.
  Inside an opened feature the pane's rows use a second vocabulary (circles
  in seven states, diamonds in three: `nav.js:930-939`,
  `topology.css:420-445`); the next link retires those.
- A feature is listed more than once: under its part and again under each
  interface it ends; and an assembly in no body is listed whole under
  "Parts" while each of its races sits under its body (`model.js:165-167`,
  `nav.js:609-613`;
  `docs/issues/ISSUE_20261120_an_assembly_in_no_body_is_listed_twice_in_the_nav_and_posed_by_nothing_in_3d.md`).
- Tried before: 10-26 `the_shell_seats_the_scene…`; 11-05
  `the_rail_holds_still…` and `the_rail_reads_as_a_tree…`; 11-10
  `the_model_is_derived_once…` and `one_selection_one_hover…`; 11-12
  `hover_and_select…` and `the_page_is_a_fixed_layout…`. Open:
  `docs/issues/ISSUE_20261114_three_tree_requests…`. Read the last two
  lessons before you start, so this is not an eighth patch of the same kind.

## Deliverables

1. **The structure tree is on screen only with the 3D pane, beside it.**
   With the pane closed, the left column holds the model and its studies and
   nothing of the structure; the map is the structure view then. Measure what
   the left column holds today and say in the lesson where each thing went.
   Opening the pane brings the tree back as it was left: same folds, same
   scroll.

2. **The tree holds still.** Across every redraw, for whatever reason, the
   row under the pointer keeps its screen position; with no pointer over the
   tree, the selected row does. Opening or closing a row moves only the rows
   below it. A selection opens the path to the selected row and nothing else,
   and closes nothing. A pick in the scene scrolls the tree only when its row
   is off screen, and then by the least that shows it. How you get there
   (patch instead of rebuild, or rebuild and anchor) is yours; the behaviour
   is the requirement.

3. **Opening and closing is seen.** A row's children ease open and closed,
   short (well under a quarter second), and not at all for a reader who asks
   for reduced motion. Film it: `node scripts/filmstrip.mjs --help`.

4. **The levels look different.** A body is a band in its colour; a part is
   plainly heavier than its features and carries "n of m" features bound; a
   feature is a regular row; a group label is quiet; each level steps in far
   enough to see at arm's length, with a guide line. Numbers live in
   `apps/viewer/style.css`'s `:root` as `docs/DESIGN_TYPE_AND_COLOUR.md`
   says. Judge it on Jeff's own screenshot case: the ground body with
   213668-002's eight features open.

5. **One mark per feature, three states: open, suggested, bound**, the same
   shape wherever a feature is listed. A part and a joint show a count, not
   a mark. A body keeps its colour square, which is identity and not status.

6. **A lit face and its row agree.** Jeff: "MS14101-3 shows the ball center
   as not bound, yet the spherical surface is hilighted green." Measured:
   the four bearing-centre features list their link-length end
   (`model.js:70-86`) but the fold keys that binding to the assembly
   (`apps/viewer/identity_fold.js:205-212`), which the feature never reads;
   the outer race's "bearing centre" inherits v1's event 0057 while the inner
   race's "ball centre" had nothing until Jeff's 0113. Make every face the
   scene lights as bound belong to a feature the tree shows as bound, for
   all four bearings, without writing an event. If two features truly share
   one face (inner ball and outer seat are concentric), say so on both rows.

7. **One grouping at a time, each thing once.** The tree lists by part or by
   joint, switched at its head beside the existing All / Unbound filter;
   by part is the default. In either, a feature appears once, and an assembly
   in no body is listed once. (Strategy decision, reversible: it goes on the
   walk's review page as a question for Jeff.)

## Definition of done

- A browser check, in the existing viewer browser suite (no new tier), that
  measures the anchored row's screen y before and after each of: open a row,
  close a row, select from the tree, select from the scene, a binding
  written from the pane, a tree update from the pane, the pane closed and
  reopened. It fails if the row moves. Why this check exists, for the guard
  rule: the 11-05 scroll guard was lost in the 11-10 rebuild and Jeff
  reported the jump again on 11-22; a misfire costs an agent a red suite,
  never Jeff a click.
- The viewer's node suite and the browser suites you touched green in the
  main checkout; default pytest green.
- **Looked at with vision**, on a scratch data root served on a scratch port
  (never 8000; how: the lesson of
  `the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page`):
  the tree at 3840 and 1536 wide with the ground body open as in Jeff's
  screenshot, before and after; a filmstrip of one open, one close and one
  bind showing the anchored row not moving; the pane closed (no structure in
  the left column). Then click around as `CLAUDE.md` asks: every kind of row,
  the filter, the grouping switch, hover, a scene pick.
- Jeff's binding log unchanged by you (count and hash before and after).
- Lesson (`docs/sessions/lessons/LESSONS_20261122_the_tree_sits_beside_the_3d_canvas_and_holds_still.md`):
  how the tree now redraws; what the left column held and where each thing
  went; the levels' numbers; deliverable 6's cause as you found it; what the
  next link must know about where a feature's form will sit.
