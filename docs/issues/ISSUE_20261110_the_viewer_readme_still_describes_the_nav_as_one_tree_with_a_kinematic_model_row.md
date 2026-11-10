---
type: chore
priority: med
status: open
area: viewer/docs
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261110_the_model_is_derived_once_and_the_left_column_is_its_tree.md
---

# The viewer README still describes the nav as one tree with a Kinematic model row

`the_model_is_derived_once_and_the_left_column_is_its_tree` (2026-11-10)
rebuilt the left column as the model's tree under a model picker and touched
no paragraph of `apps/viewer/README.md`. Four of its sections now describe the
retired surface:

- **"The one nav"** -- *"a single tree, not a picker plus a separate stack
  rail: every topology lists its studies as children, and every stack no
  topology re-expresses is a leaf beside them"*. The column is a `<select>`
  picker (models, then the loose stacks under "Other analyses") over the open
  model's tree: Rigid bodies > Parts > features, Interfaces, Joints between
  bodies, Studies.
- **"Kinematic studies -- a section of their own"** -- the section now exists
  only for a group whose model the topology projection does not list; a listed
  model's kinematic studies sit under its Studies heading, and the row is
  "Play the newest sweep", not "Kinematic model" (also at "The Kinematic model
  row opens the 3D scene...").
- **"What a nav row wears"** -- *"A study row, a loose-stack row: a single
  drawn triangle"*. A loose stack has no row and wears no mark
  (`ISSUE_20261110_a_loose_stacks_status_mark_left_the_nav_with_its_row.md`);
  the tree's feature rows wear a different one-mark rule (bound / suggested /
  none, `VA.FEATURE_STATUSES`).
- The scene-tree paragraphs describing the annotator's whole rail mirrored
  under the active row: it is one subtree now, under the selected feature
  (`VA.sceneRowsForFeature`).

`tests/test_viewer_readme_doc_facts.py` pairs none of these sentences, which is
why the suite is green with the README wrong. The `## Layout` tree's missing
`model.js` row was added in review (inline); the prose above is a rewrite,
not a line.

## What to do

Rewrite the four sections against `views/nav.js`'s header comment (the tree
diagram there is the current statement) and `docs/DAG_TOPOLOGY.md`, "The
model view". Keep the history blockquotes; move the retired descriptions
under them.
