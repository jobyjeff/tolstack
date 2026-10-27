---
type: feature
priority: med
status: open
area: viewer/annotate pane
reporter: agent
found_by: docs/sessions/HANDOFF_20261026_the_model_is_drawn_in_the_scene.md
---

# The shell does not yet post its lit set or its dim-or-hide word to the scene

The annotator's `model` layer (handoff `the_model_is_drawn_in_the_scene`)
draws the active study's lit set at full strength and the rest dimmed or
hidden — "the shell posts it as a command". The scene side is built: it
takes `model lit <edge>…` / `model lit all` and `model unlit dim|hide` over the
existing `annotate:exec` channel. **Nothing in `apps/viewer/` sends either**,
because that handoff was fenced out of `apps/viewer/`.

Until it does, the embedded scene falls back to its own reading of the page's
study (`modelDefaultLit` in `apps/annotate/app.js`): a chain study's
`selection` in bind mode, the edges a kinematic study's stops name in sweep
mode. That differs from the shell's `VA.kinematicLitSet` in one place — the
shell also lights an edge a contributor borrows its band from
(`band_source.kind == "dimension_ref"`, and a `band_source.study`'s chain) —
so on a study with a borrowed band the 3D model and the 2D DAG disagree about
which edges are lit. And the toolbar's "Unused: dimmed / hidden" toggle has no
effect on the scene at all.

## Fix shape

In `apps/viewer/topology_app.js`, wherever the page's lit set or
`state.unlitStyle` changes while the scene is open (and on the pane's first
`annotate:state`), post:

> ```
> {type: "annotate:exec", command: ["model", "lit", ...Object.keys(lit.edges)]}   // or ["model", "lit", "all"] for null
> {type: "annotate:exec", command: ["model", "unlit", state.unlitStyle]}
> ```

The staged handoff `leaders_follow_the_active_study_across_the_seam` (scope
`apps/viewer/`) is the natural owner: its deliverable 2 already scopes the 3D
leaders to the same lit set and the same toggle. A TRUTH check there can read
`window.__model.lit` / `window.__model.unlit` in the pane after a toggle.
