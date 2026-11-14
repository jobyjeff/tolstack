---
priority: med
depends_on: [hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque]
model: opus
hitl: false
---

# HANDOFF 2026-11-12 — a_part_links_to_its_drawing_before_it_has_a_tolerance: the preview of a part or assembly opens its drawing in drawing-checker when a run exists

Source: Jeff's forge note `20261112T114449_f3anmp` (2026-11-12): "in the preview
pane for each part/assembly, let's add cross links to the drawing-checker page
(if a run exists for that drawing). Actually I think this is already supported
for individual tolerances, we just haven't added any tolerances to the new model
yet… but the shortcuts should also be available before you assign any tolerances
(since you already know the part number)". Strategy record:
`dispatch/docs/strategy/HANDOFF_20261112_strategy.md`.

Baseline: `integration` after the highlight handoff named in `depends_on` (same
files in `apps/viewer/`; one viewer handoff at a time). Scope:
`scripts/build_topology_projection.py`, the model view it feeds
(`tolerance_stack/model_view.py` only as far as a part's record), the part
preview in `apps/viewer/`, docs, tests. Do NOT touch `build_viewer_crops.py`'s
citation path, the DAG, the grid or drawing-checker.

## What exists (read on master, 2026-11-12)

- The link builder is `VA.runUrl` (`apps/viewer/viewer.js:1427-1432`):
  `<drawingCheckerWebui>/run/<run_dir>`, base `http://127.0.0.1:8000`
  (`apps/viewer/config.js:33`).
- It needs a run directory. Today one is resolved only for a **citation**, at
  build time, into `crops.json` by `scripts/build_viewer_crops.py` (from a
  citation's `export.runs` or `joint.assembly_export`, `:413-419, 500-519`,
  prefix-matched against drawing-checker's run directories, `:266-268`). The
  end-stop model (v2) has no citations yet, so it has no links.
- There is no part-number → run index. One is derivable at build time: run
  directory names under `C:\workspace\drawing-checker\data\runs\` carry the
  drawing number and revision (for example
  `20261112_104250_214373-003_A.1_…`), as does each run's `run_meta.json`.
- The match must be exact on the dash number: the model's hub is 214373-002 and
  the newest hub run is the 214373-003 assembly.

## Deliverables

1. **Each part's record carries its drawing runs.** `build_topology_projection.py`
   writes, per part, the drawing-checker runs whose drawing number equals the
   part's number exactly (base and dash), newest first, each with its revision
   and date. Read drawing-checker's run directories by absolute main-checkout
   path; a part with none carries an empty list. Reuse the run-directory reading
   `build_viewer_crops.py` already has rather than writing a second parser.
2. **The preview shows the link.** In the preview of a part or an assembly: the
   part number is a link to the newest run (`VA.runUrl`), opening in a new tab,
   with the revision beside it; when there are older runs, a count that opens to
   them. No run → the part number is plain text and nothing else is drawn (no
   "no drawing" sentence). Sites: the preview reached from the tree, from the
   DAG and from the grid; v1 and v2. A tolerance row's existing citation link is
   left as it is.
3. **A part number that is close but not the same is offered, marked.** When
   the exact number has no run and another dash number of the same base does,
   the preview shows that one as `214373-003 (different dash number)` — a link,
   visibly not the part's own. This is a display choice, not a citation.

## Definition of done

- On v2 at `http://127.0.0.1:8000/`: every part's preview opened once; the
  lesson carries a table of part number → link shown (own run, other dash
  number, none), read from the page. Two shots at 3840×2160, looked at: a part
  with its own run, the hub with the other-dash-number link.
- Tests: value-level on the per-part run list against a small fixture of run
  directory names (exact match, other dash, none, newest first); the default
  `pytest -q` once; `node apps/viewer/run_tests.cjs`; the browser runner with
  `--only` for any suite added or changed.
- Lesson (`docs/sessions/lessons/LESSONS_20261112_a_part_links_to_its_drawing_before_it_has_a_tolerance.md`):
  the table; how many of v2's parts have a run today; which are missing a
  drawing Jeff would have to export.
