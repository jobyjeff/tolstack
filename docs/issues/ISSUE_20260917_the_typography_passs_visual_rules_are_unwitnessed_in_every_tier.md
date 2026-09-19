---
type: bug
priority: med
status: triaged
area: viewer/tests
reporter: agent
handoff: docs/sessions/HANDOFF_20260918_visual_rules_nothing_checks.md
found_by: docs/sessions/reviews/REVIEW_20260917_design_pass_typography.md
---

# Every visual rule `design_pass_typography` settled can be reverted with all three tiers green — including the confidence leak it was written to fix

Measured 2026-09-17 in `review/design_pass_typography`, by planting each edit
in a `git archive HEAD` scratch tree (`%TEMP%/tsrev`, short path, with
`node_modules` junctioned in) and running all three tiers:
`venv-win/Scripts/python.exe -m pytest -q`,
`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`,
`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`.

The handoff added a real guard, `tests/test_app_type_scale.py`, and it works —
it was observed failing four distinct ways in review (a bare `px` font-size, a
drifted annotator copy, a dropped step name, all-caps above `--t-meta`), each on
the test that owns the claim. **What it pins is the scale: that the six steps
are declared, ordered and distinct, and that every `font-size` in either app is
a `var(--t-*)`.** Nothing pins any of the *rules* the pass settled, and nothing
else in the repo reads a `.css` file for a value.

## What reverts green

| edit | tiers after the revert |
| --- | --- |
| `.chip.conf--*` → `.conf--*` (drop the `.chip` scope, all four rules) | pytest at baseline, **453/453**, **22/22** |
| every `max-width: var(--measure)` deleted (12 selectors, both stylesheets) | pytest at baseline, **453/453**, **22/22** |
| `.el-row__name { min-width: 190px }` deleted | pytest at baseline, **453/453**, **22/22** |
| `.el-row__srcnote` clamp `2.8em` → `4.6em` | pytest at baseline, **453/453**, **22/22** |
| `.crop-trigger` back to `background: var(--on); color: #fff` | pytest at baseline, **453/453**, **22/22** |
| `.tvflag` back to filled, 700 | pytest at baseline, **453/453**, **22/22** |
| `apps/annotate` `body` back to `font-family` only (no base size) | pytest at baseline, **453/453**, **22/22** |

All seven reverted together is also **453/453 and 22/22**. (pytest's "baseline"
is the one pre-existing
`test_no_live_document_states_an_unguarded_hardware_entry_count` failure, which
is `ISSUE_20260916_a_strategy_briefs_prose_trips_the_hardware_entry_count_guard`
and is not this work's.)

## Why the first row is the one that matters

The other six are aesthetic settings, and a reader would notice them. The first
is a **legibility regression the pass found already shipped**, and the mechanism
that produced it is generic rather than a one-off:

`VA.confidenceClass()` returns a vocabulary token (`conf--traced` /
`conf--inferred` / `conf--untraced` / `conf--no_source_ref`), and five kinds of
element wear the result — a `span.chip`, three kinds of `<tr>` (`el-row`,
`mat-row`, `tvrow--edge`) and an SVG `line.rail__bar`. The two filled rules
carried `color: #fff` and `font-weight: 700`, written for an 11px pill, and
handed them by inheritance to **every cell of every untraced row**: measured on
the live `pitch_system`, 8 of the grid's first 10 rows and both materials rows
rendered entirely in 700-weight white, and `conf--traced`/`conf--inferred`
tinted all eleven columns of a row, numbers included.

So the class of defect is: *a rule keyed on a vocabulary token alone is a rule
whose scope nobody decided*, and the same edit is available to every future
`conf--*`, `tvflag--*` or `values-*` rule. The lesson states that as its general
finding. Nothing enforces it.

## What would close this

Two assertions, not seven. The cheap ones, in rough order of value:

1. **A browser-tier sub-check on an untraced row's own cells** — the tier
   already opens the live topology grid and the live stack view. Read
   `getComputedStyle` on a `tr.el-row.conf--untraced`'s `td`s and assert the
   weight is the table's and the colour is not `#fff`, with a non-vacuity
   witness that the row's *chip* **is** filled and 700, so the check goes red
   for being unable to see the difference rather than green for not finding
   one. That is the one assertion that covers the generic case, because it is
   about inheritance rather than about a selector string. Declare it in
   `scripts/mutation_witnesses.json` with `find` = the `.chip.conf--untraced`
   line, so the tier watches it reddening from then on.
2. **A stylesheet scan, in `tests/test_app_type_scale.py`'s own shape** — every
   rule whose selector is a bare vocabulary token (`^\.conf--`, `^\.tvflag`,
   `^\.chip--values-`) must not declare `color`, `font-weight` or `background`.
   Three lines, no browser, and it states the rule rather than one instance of
   it. This is the half that generalises to the *next* token.

`--measure`, the name-column floor and the note clamp are worth one browser
assertion between them if anyone is in the file anyway (a capped paragraph's
`clientWidth` against `--measure`, and the two row heights the materials issue
already measures) — but they are not why this is `med`.

## Precedent, and why this was not a blocker

The review APPROVEd. The shipped CSS is correct — all 26 committed before/after
screenshots were re-taken independently in review and are **byte-identical**, so
the evidence the handoff's definition of done asks for is sound, and every
deliverable the handoff *named* (the sweep, the doc note, the filed issues) is
delivered. The fix here is additive assertions, which is the same call
`REVIEW_20260917_crop_lightbox_zoom_viewer` made on the same shape one day
earlier (`ISSUE_20260917_the_crop_lightboxs_fit_clamp_and_hairline_are_
unwitnessed_in_every_tier`). Those two issues are the same enrolment pass and
triage should stage them together; this one carries the generic rule the other
does not.
