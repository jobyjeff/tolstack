---
priority: high
depends_on: [the_dag_is_zoomable_and_a_length_mode_draws_to_scale]
model: opus
hitl: false
---

# HANDOFF 2026-10-28 — the_active_study_is_a_compact_band_and_the_rest_of_the_model_hangs_above_and_below: the DAG re-arranges around the selected study without hiding anything

Source: Jeff's 2026-10-28 review ("the auto-rearrange … seems to be
disabled … I didn't mean to disable it altogether … the active part of the
model for any given study becomes a straight vertical line, with the rest of
the graph extending above/below it … make every attempt to rearrange the
graph so that the active part is as compact and clean as possible … so you
don't have to scroll the graph to see all the elements of the active
study"). Baseline: `master` with `the_lit_set_closes_over_its_joints` and
`the_dag_is_zoomable_and_a_length_mode_draws_to_scale` merged (the lit set
is connected; the DAG has a transform, Fit, and to-scale lengths). Scope:
`apps/viewer/topology.js` (`rowPositions` ~:1426, `centreOffsets` ~:1353,
`spineRight` ~:1894, `tweenPositions`/`respineX`, `bodySpans` ~:2099),
`apps/viewer/views/topology.js` (`renderTopoPane`, `railsSvg`, `gridPlan`
~:256), `apps/viewer/topology.css`, `apps/viewer/tests.js`, the browser
specs `testRespine` (~:9505) and `testKinematicStudyPage` (~:9148). Python
layout (`scripts/build_topology_projection.py`) only if the JS cannot do it
from the serialized walk — say so in the lesson if you go there. Do NOT
touch `apps/annotate/`, `views/kinematic.js`'s chart, or the lit-set code.

## History the agent must know (so it does not re-fight it)

- A per-study layout swap existed on 2026-09-14 (`789cc2a3`: the chain
  right-justified, grid in sum order, animated) and was **removed on
  2026-09-15** (`viewer_respine_whole_walk`, `6cd62bd7`) on Jeff's rule
  *"when you click a study/stack, the entire dag/model should still be
  visible"* (`views/topology.js:27–33, 218–224`;
  `LESSONS_20260915_viewer_respine_whole_walk.md`). Since then selecting a
  study moves only the pane width and `gridOffset`; columns do not shift.
  `VA.spineRight` mirrors every column once regardless of study. The tween
  machinery (`VA.tweenPositions`, `VA.respineX`) survived and is tested on a
  hand-built frame.
- The 10-26 kinematic handoff asked for "the lit set as the right-hand
  rail"; its lesson (`LESSONS_20261026_the_kinematic_page_keeps_the_dag…md:50–60`)
  found spineRight never did that and built no re-columning. "Right-aligned"
  today means the grid of lit rows on the right.
- Python emits each study's own one-rail layout
  (`build_topology_projection.py:1383`, `row["layout"]`) and no viewer code
  reads it.
- Today's walk: one global row order (body by body, joints deferred LIFO),
  169 rows / 11 columns; `order_columns` (~:716) and `_improved` reduce
  crossings over the whole walk.

So the thing Jeff remembers is the 09-14 swap, and the rule that retired it
still stands. **This handoff builds the third shape: nothing is replaced,
nothing is hidden, the rows are re-ordered so the active study is one
compact contiguous band and the rest of the model stays drawn above and
below it.**

## The shape (the strategy session's recommendation; prototype, then commit)

1. **Row re-ordering, not row removal.** For the selected study, the lit
   rows (nodes and edges, after joint closure) become one contiguous band
   in the middle of the walk, keeping their relative walk order. Unlit rows
   keep their relative order and go **above** the band if they precede the
   first lit row in the global walk and **below** if they follow the last;
   an unlit row interleaved inside the lit span goes to whichever side it is
   nearer in walk order. Body containers that this splits draw as several
   fields (already allowed since 10-26); the label sits on the band's field.
2. **The band is as straight as the graph allows.** Within the band, re-run
   the column assignment on the lit sub-walk alone: a linear chain is one
   rail; a branch (the kinematic study has a few — the two link joints, the
   travel sub-stack) takes the adjacent column for the length of the branch
   and rejoins. Unlit rows above and below keep the global columns (the
   leaders and the mirrored spine must still land). Measure crossings
   inside the band before/after.
3. **Transition.** Use the existing tween: positions keyed by id move; the
   seam leaders to the scene and the grid leaders follow the moving anchors
   (the zoom handoff's lesson says which anchor space they read). Duration
   and easing as `testRespine` already pins.
4. **Fit after re-arrange.** On study select, the Fit control (previous
   handoff) frames the band; "Unused: hidden" now shows just the band, and
   — because the lit set is connected — a single drawing. The old
   "entire model visible" rule holds in dimmed mode.
5. **Measured target.** On `Blade pitch at the end stops` at compact density
   in a 1000 px-high window, the band is visible without scrolling when
   fitted; every one of the 22 studies yields a contiguous lit band (a test
   asserts contiguity over the real projection); crossings within each band
   ≤ crossings the same lit rows had in the global walk.

Two alternatives the strategy session considered and did not pick — record
in the lesson if the prototype makes either look better: (B) keep the
global walk and rely on hidden-mode + Fit alone (cheap; loses the "rest of
the model above/below" context Jeff asked for); (C) the 09-14 per-study
layout swap (rejected by Jeff on 09-15; do not rebuild).

## Definition of done

- Browser: select each of three studies in turn (the kinematic one, a grip
  budget, a thermal fit) — the lit rows are contiguous, the band fits the
  pane after Fit, nothing is hidden in dimmed mode, hidden mode is one
  connected drawing, leaders land on the moved anchors (assert endpoints
  coincide with node centres after the tween settles).
- `tests.js`: contiguity over the real projection for all 22 studies; the
  above/below assignment rule on a hand-built walk with interleaved unlit
  rows; body fields split correctly; `testRespine` updated.
- All four main-checkout tiers green after a projection rebuild;
  `pytest -q` green.
- Lesson (`docs/sessions/lessons/LESSONS_20261028_the_active_study_is_a_compact_band_and_the_rest_of_the_model_hangs_above_and_below.md`):
  crossings before/after per study (table); band height per study at both
  densities; whether the Python per-study layout should now be deleted;
  what the band does to the study-groups handoff that follows.
