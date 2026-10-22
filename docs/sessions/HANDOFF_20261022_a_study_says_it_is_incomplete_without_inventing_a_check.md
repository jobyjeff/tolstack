---
priority: med
depends_on: []
model: sonnet
---

# HANDOFF 2026-10-22 — a_study_says_it_is_incomplete_without_inventing_a_check: completeness is a field of the study, derived from its terms, and the viewer badges it

Source: `docs/issues/ISSUE_20261016_a_study_with_no_checks_has_nowhere_to_say_it_is_incomplete.md`
(feature, low) via `docs/strategy/BRIEF_20261021_what_a_term_cites_when_its_drawing_does_not_band_it.md`
instance 4 (brief consumed 2026-10-22; the decision below is the strategy
session's). Baseline: master after the 2026-10-22 batch merge. Scope: the
study schema (`joby.tolerance_stack/study/v0` — find its definition and its
docs by that string), `tolerance_stack/` where studies fold and validate,
`apps/viewer/` (study header), the study files under `docs/topologies/`,
`tests/`. Do NOT edit any term's band, `kind` or `source_ref`, the SOP's
citation rules, or the worksheet — the sibling
`a_general_profile_note_bands_a_model_defined_term` owns those and may run
at the same time; your change must fold correctly over its edits and over
today's.

## The decision

`complete` and `excluded_terms` are fields of a **check** today, so a study
with `no_checks_reason` cannot say it is incomplete without inventing a
limitless check, which this repo forbids. The fix is one vocabulary in one
more place, not a second vocabulary:

- A study gains `completeness: { "complete": bool, "reason": str | null,
  "open_terms": [edge ids] }`.
- It is **derived at fold time, never authored**: `complete` is false when
  any selected edge carries `kind: assumed` or `kind: gap`, or a `source_ref`
  with `confidence: untraced`; `open_terms` lists them; `reason` is a short
  generated sentence naming the count and the first two ids. A hand-written
  `completeness` in a study file is a validation error (the derivation is
  the authority), the same stance the repo takes on derivable counts in
  prose.
- A check's existing `complete`/`excluded_terms` keep their meaning (a
  check's coverage of its terms); the study-level field is the fold of all
  terms, with or without checks. The schema doc says so in one paragraph.

## Deliverables

1. **Schema + derivation.** The field, its derivation, validation of
   hand-authored values, and the schema doc paragraph. Pin with tests on a
   fixture study: all-traced → complete; one `assumed` → incomplete with that
   id; one `gap` → incomplete; a hand-written `completeness` → error.
2. **Applied to the real studies.** Re-fold every study under
   `docs/topologies/`. Today the travel study
   (`study_vpa_pitch_linkage_travel_between_end_stops.json`) has two
   `assumed` edges → incomplete, `open_terms` =
   `[piston_head_upper_thickness, gas_spring_mount_flange_to_end_stop]`; after
   the sibling lands it becomes complete with no edit of yours. Report the
   completeness of each study in the lesson, before and (if the sibling has
   merged by then) after.
3. **The viewer badges it.** The study header shows one badge — `incomplete`
   in everyday words (follow the viewer's existing badge vocabulary and
   `reader_facing_bans.js`), hover = the reason and the open terms, each a
   link to the term. A complete study shows nothing extra. Name the sites
   this reaches: the study header, the studies list if one exists, the
   topology page's study chips if they render state; change those that
   render, and list in the lesson the ones that render nothing.
4. **The issue's own case.** `no_checks_reason` studies render the badge
   exactly like studies with checks — that is the point; a test drives the
   travel study through the viewer fixture path and asserts the badge.

5. **One line in `apps/viewer/index.html`.** Drop the
   `<meta http-equiv="refresh" content="0; url=./topology.html" />` line; the
   `window.location.replace(...)` beneath it carries the query string and the
   meta cannot, so whichever the browser honoured decided whether
   `?stack=<id>` survived the hop (drawing-checker's
   `ISSUE_20260911_mounted_tolstack_viewer_entry_point_double_redirects`,
   routed here 2026-10-22). Keep the `<p>` fallback link. No test beyond the
   existing boot probe if one runs here; say in the lesson that the shim now
   redirects once.

## Definition of done

- `venv-win/Scripts/python.exe -m pytest -q` green in the main checkout;
  `node apps/viewer/run_tests.cjs` green; the browser tier for the specs you
  added via `--only` (never the full registry on a branch), under the browser
  slot (`dispatch slot run --class browser`).
- The travel study page shows `incomplete` with its two terms (or complete,
  if the sibling merged first — say which).
- Lesson (`docs/sessions/lessons/LESSONS_20261022_a_study_says_it_is_incomplete_without_inventing_a_check.md`):
  per-study completeness table; the viewer sites changed; suite wall time.
