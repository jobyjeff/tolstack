---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-10-20 — the_viewer_shows_a_kinematic_study: a kinematic study is a page in the viewer — envelope, ranked contributors per stop, verdict, provenance — and the entry row for the kinematic model

Source: strategy session 2026-10-20. Jeff locked **one shell**: the viewer
page (`apps/viewer/topology.html`) is the app; the annotator is its one 3D
scene. This handoff is the first of three (next: the flyout becomes a pane
that opens in the mode the study wants; then the sweep-mode rail shows the
mechanism). Baseline: `integration` (the kinematic study code and its first
study, `a_kinematic_study_folds_the_sweeps_jacobian`, merged 2026-10-16).
Scope: `apps/viewer/` (a new view module, the nav tree, the deep-link
contract, tests), `scripts/js_vocabulary.py` + regeneration,
`scripts/rebuild_projections.ps1`, `scripts/projection_freshness.cjs`,
`apps/viewer/README.md`, `docs/DAG_TOPOLOGY.md`'s viewer paragraph. Do NOT
touch `apps/annotate/` (the rail handoff staged today owns it; the pane
handoff follows this one), `tolerance_stack/kinematic.py` beyond exposing a
vocabulary, or any topology/study JSON.

## What exists, and what the page reads

`scripts/build_kinematic_projection.py` writes
`C:\workspace\tolstack\data\projections\topology\kinematic\kinematic_studies.json`
plus one evidence SVG per study (`vpa_pitch_linkage_blade_pitch_at_the_stops.svg`).
Nothing reads it; it is not on the rebuild rail
(`docs/issues/ISSUE_20261016_the_kinematic_projection_has_no_reader_and_is_not_on_the_rebuild_rail.md`,
on `integration` — this handoff resolves it). Shape, top level: `schema`,
`built_at`, `built_by`, `provenance`, `study_statuses`, `studies[]`. One
study today: `vpa_pitch_linkage_blade_pitch_at_the_stops`, "Blade pitch at
the end stops", topology `vpa_pitch_linkage`, measure `blade_pitch`, from run
`vpa-pitch-p2-20261016-235852`. Per study:

- `envelope[]` — one row per sweep point: `driver_value`, `nominal_measure`,
  `worst_case_min/max`, `rss_min/max`, `rss_half`. The nominal is the
  sweep's solved value; the intervals are variation about it.
- `stops[]` — `{id, label, target, context_ref, rows[]}`; two stops,
  `minus7` ("-7 deg stop (low pitch)") and `plus72`. `rows[]` are already
  ranked: `edge` (a `vpa_pitch_linkage` edge id), `kind` (`term` / `gap` /
  `zero_sensitivity` — Python's `ROW_KINDS` in `tolerance_stack/kinematic.py`,
  which must reach JS through `scripts/js_vocabulary.py`, never a hand
  copy), `zone`, `sign`, `coefficient`, `entries`, `band` (with units),
  `magnitude` (null on a gap), `confidence`, `band_source`, `feature`,
  `feature_source`, `gap`. First study at −7°: `pitch_plate_attach_height`
  0.156°, `pitch_link_length` 0.047°, `pitch_arm_radius` 0.024°,
  `tan_link_mount_height` 0.017°, then two gap rows (`tan_link_length`,
  `pitch_plate_tan_link_attach_radius`).
- `checks[]` — `rounded_check`'s shape exactly (`verdict`, `verdict_scope:
  budget`, `margin`, `complete`, `excluded_terms`, `input_confidence`,
  `worst_confidence`) plus `stop`, `limit` (with `source_ref`, S461-607
  ±0.5°) and `context_ref` (S461-241). Margins 0.256° / 0.258°.
- `sweep` — `run_id`, `pipeline_commit`, `max_finite_difference_disagreement`,
  `features_in_artifact`; `provenance` prose; `units`; `contributor_count`,
  `gap_count`; `status` / `error`; `no_checks_reason`.

The lesson `docs/sessions/lessons/LESSONS_20261016_a_kinematic_study_folds_the_sweeps_jacobian.md`,
section "What the viewer will need", is the author's own list; the numbers
above are from the built file.

## Deliverables

1. **The projection is served where the viewer already reads.** Confirm
   which directory drawing-checker's `/tolstack/data/` mount serves
   (`C:\workspace\drawing-checker\webui\analyses.py`, `tolstack_mounts()`;
   `topologies.json` sits at its root). The kinematic projection must live
   under that directory — move the builder's output there if it does not
   (the hosted bake copies the mounted dirs, so no drawing-checker change is
   owed and none is allowed). The viewer fetches it through the same
   transport (`apps/viewer/storage/`) that fetches `topologies.json`, with the
   same `[real]` / freshness treatment: add the builder to
   `scripts/rebuild_projections.ps1` and the file to
   `scripts/projection_freshness.cjs`'s inputs so a tier refuses a kinematic
   projection whose inputs moved. Absent file → the nav section is absent
   and nothing else changes (file:// double-click included).
2. **A "Kinematic studies" section in the nav tree** (`VA.navTree`,
   `views/topology.js`; rendered by `views/nav.js`): one row per study,
   `title` as the label, `description` as the tooltip, grouped under its
   topology's name; a topology that has published sweep runs but no study
   gets a model row ("Pitch linkage — kinematic model") that will open the 3D
   pane in sweep mode once the pane handoff lands — until then it opens the
   annotator link `../annotate/index.html?sweep=<newest run id>`
   (`VA.annotateLink` gains a `sweep` param and `VA.annotateExecCommands`
   the matching `["sweep", runId]` — extend both and both of their tests,
   the hand-mirror rule in `viewer.js`). The 2026-10-08 decision 1 in
   `dispatch/docs/strategy/drafts/DRAFT_kinematic_model_viewer.md` is this
   row.
3. **The study page** (a new `views/kinematic.js`, the `views/stack.js` /
   `views/topology.js` shape), selected by the nav row and by the deep link
   `topology.html?kinematic=<study id>` (add to `VA.DEEP_LINK_PARAMS` and the
   README's "Deep links in" contract). Top to bottom:
   - **Head**: title; one verdict chip per stop built by the existing
     `checkCard` (`views/topology.js`, `checkCard(row)`) — pass/budget/margin
     in the words it already uses; the sweep's driver label and unit.
   - **The envelope chart**, drawn live from `envelope[]` as inline SVG (this
     repo has no chart library and must not gain one): x = driver value, y =
     **deviation from nominal** (a ±0.24° band on an 80° axis is invisible —
     the 10-16 lesson's finding), worst-case band, RSS band inside it, the
     ±limit as hairlines, both stops marked at their `driver_value`, hover on
     a point reading driver / nominal pitch / ± worst / ± RSS in a tooltip.
     Type sizes and colours from `apps/viewer/style.css`'s `:root`
     (`tests/test_app_type_scale.py` pairs them). The static SVG beside the
     JSON is **not** embedded; it stays the builder's evidence file.
   - **Per stop, the ranked contributor table**: contributor (the edge's
     `name` from the topology, the id behind hover), zone, sign, coefficient
     (with its unit, `deg/mm`), band, magnitude, confidence. A `gap` row has
     no magnitude and reads as the gap edges elsewhere do (same class, the
     words "no band on file"); a `zero_sensitivity` row is muted. Numbers
     right-aligned, tabular numerals, three decimals as the lesson pins. Each
     row **deep-links to that edge's rail** (`?topology=…&edge=…`) and, when
     a binding exists, to its 3D view the way the rail's "attach to 3D" does.
     One table per stop, stops as tabs or stacked — your call; say why.
   - **Provenance behind one disclosure**: sweep run id, pipeline commit,
     finite-difference disagreement, features in artifact, the study's prose,
     `excluded_terms` from the check (that list is the honest "what this
     number is not").
   - **Copy rules** (binding): no paragraph explanations; always-visible text
     one line; no internal names on the surface (`kind` words through the
     generated vocabulary, never `zero_sensitivity` printed raw; `feature_source:
     authored` reads as words); every number carries its unit; one accent per
     view (the verdict).
4. **Docs**: `apps/viewer/README.md` (the new section, the deep link, the
   projection file), `docs/DAG_TOPOLOGY.md`'s paragraph on what the viewer
   shows for a kinematic study (one paragraph, pointing here), `ARCHITECTURE.md`
   inventory row for the view module and the freshness input. Resolve the
   projection-reader issue with a line naming the view module.

## Definition of done

- `node apps/viewer/run_tests.cjs` in the main checkout: the `[real]` tier
  reads the live `kinematic_studies.json`, finds one study, pins both
  margins to three decimals (0.256 / 0.258) and both gap rows by edge id.
- Browser TRUTH tier: opens `topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`,
  reads the two verdict chips, hovers an envelope point and reads its
  tooltip, finds six rows under the −7° stop with the fifth and sixth marked
  as gaps, follows the first row to `pitch_plate_attach_height`'s rail; and a
  run with the projection absent renders no section and no error.
- `scripts/rebuild_projections.ps1` builds the kinematic projection in its
  place in the order; the freshness check refuses a stale one; any guard you
  add has its mutation spec; `venv-win/Scripts/python.exe -m pytest -q` green
  but for the documented worktree-only red; vocabulary regenerated.
- Lesson (`docs/sessions/lessons/LESSONS_20261020_the_viewer_shows_a_kinematic_study.md`):
  which directory the data mount serves and where the projection landed;
  the chart's axis decisions; the one-table-per-stop layout decision; what
  the pane handoff needs from this page (the launch params it should post).
