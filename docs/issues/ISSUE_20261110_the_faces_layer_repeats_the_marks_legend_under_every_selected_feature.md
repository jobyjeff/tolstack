---
type: feature
priority: low
status: deferred
area: viewer/nav
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261110_the_model_is_derived_once_and_the_left_column_is_its_tree.md
defer_until: 2026-12-10
class: internals_on_a_user_surface
resolution: deferred 2026-11-10 (triage) -- low defers by default
---

# The faces layer repeats the marks' legend under every selected feature

The pane's rows for a selected feature are drawn under its row in the tree
(2026-11-10), and the pane's legend -- the seven marks beside their words --
is drawn above them, as it was above the whole mirrored rail. Under one
feature it is seven items of chrome over two or three rows, and it repeats
wherever the reader next selects.

The legend exists because a bare mark says nothing. Options: a hover title on
each mark instead (one hover surface per mark, the rule the nav already
follows for its own marks); the legend once, at the foot of the column; or the
legend folded. Jeff's "whitespace before chrome" argues for the first.

## Addendum 2026-11-11 (one_selection_one_hover_and_leaders_off)

The legend no longer appears under a feature at all: a feature row is its own
disclosure and its body is drawn by `VA.renderFeatureBody` (`apps/viewer/views/nav.js`),
which draws no legend. The marks' words are on each row's hover. Whether the
legend belongs anywhere on the page (once, for the whole tree) is still this
issue's question; the repetition it names is gone. The browser check
`[real] the legend draws every mark once, as the annotator names them` was
retired with its spec. See also
`ISSUE_20261111_renderscenetree_and_the_marks_legend_are_tested_but_the_app_no_longer_draws_them.md`.
