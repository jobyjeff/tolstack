---
type: review
handoff: stack_export_tabular
reviewer: agent
date: 2026-09-04
verdict: APPROVE
blockers: 0
---

# Review — stack_export_tabular

Scope: `scripts/export_stack_tabular.py` — export a stack or topology study to a
spreadsheet-shaped CSV from the stored JSON and `fold()`/`summarize()`, never
from the viewer's DOM. Single commit on `handoff/stack_export_tabular`
(`592b7ec`), fast-forward merged into this review branch to test.

This handoff is plumbing, not a tolerance stack — "The mandatory checks" (a
tolerance-stack provenance audit) don't directly apply, but its purpose is
provenance-adjacent (a cert-artifact exporter), so I read it with the same
scrutiny checks 1/2/4 ask for: does every number in the export actually match
what the repo's one `fold()` says, and does the sign/term model survive the
trip.

## What I verified

- **Design decision 1 (no second combiner).** Confirmed: `element_rows_for_*`
  and `fold_rows_for_*` only read `StackElement`/`Interval`/`CheckResult`/
  `Contribution` fields already computed elsewhere; nothing here re-derives an
  interval. Test suite pins several rows against `stack.path()`/`stack.check()`/
  `summarize()` directly — good, and this is the right way to guard design
  decision 1.
- **CSV/BOM/special-character handling.** `utf-8-sig`, and `±`/`⌀` round-trip;
  pinned by `test_written_csv_preserves_plus_minus_and_diameter_characters`.
  Verified by hand too.
- **Gap-bearing stack stays visibly not-clean.** Ran the exporter against
  `stack_pitch_link_to_pitch_plate.json`: `untraced`/`inferred` confidences,
  the `complete: false` / `verdict: fail` check and its `excluded_terms` all
  ride through into the CSV unchanged. Matches the DoD.
- **Provenance header.** `schema`/`exported_at`/`exported_by`/`source_file`/
  `branch`/`head_sha`/`dirty`, correctly deferring to `projection_provenance.stamp()`
  rather than reinventing it — and the lesson's "why no guard() call here" is
  right: this script writes a new file per invocation, not the one shared
  `data/projections/viewer/*.json` the ancestry gate protects.
- **ARCHITECTURE.md / PROVENANCE.md / docs/tolerance_stacks/README.md.**
  `test_the_projection_provenance_row_counts_and_names_its_importers` still
  passes with the reworded "all five ... (... and `export_stack_tabular.py`,
  2026-09-04 -- for its provenance stamp: ... does not call the gate)" —
  the row explicitly flags its own oddity rather than letting a reader assume
  the fifth importer is a projection writer. PROVENANCE.md's new sentence
  matches the actual README diff.
- **CSV vs `.xlsx`.** Investigated, not assumed — the lesson correctly points
  at the repo's prior xlsx-tooling decision rather than re-litigating it from
  nothing.

## Findings

### Blocker: the "one sign/coefficient per element" column silently discards term occurrences the thermal_fit archetype generates with a *different sign* — and the lesson's justification for this is empirically false

`element_term_context()` resolves an element's `sign`/`coefficient` by scanning
`stack.checks` in file order and taking the **first** match
(`export_stack_tabular.py:207-226`). The module docstring and the lesson both
justify this as safe: *"an element can in principle appear in more than one
check with different signs (none of the seeded stacks do)."*

That's wrong, and disprovable with the repo's own tooling. `thermal.py`'s
`build_checks()` generates one check per chain × stage × temperature (16
checks for `hub_bearing_thermal_fit_m1`), and `stage_terms()` gives the same
sleeve-bore element **sign `+1`** at stage `hub_to_sleeve` and **sign `-1`** at
stage `sleeve_to_bearing` whenever `0 < k < 1` — true of both chains here
(`k=0.8`, `k=0.9`). Confirmed two ways:

```
$ venv-win/Scripts/python.exe tests/debug_report_thermal_fit.py --terms | grep sleeve_bore_lower
lower_seat__hub_to_sleeve__cold      sleeve_bore_lower  +1  0.999588...
lower_seat__hub_to_sleeve__room      sleeve_bore_lower  +1  1.000000...
lower_seat__hub_to_sleeve__hot       sleeve_bore_lower  +1  1.000535...
lower_seat__sleeve_to_bearing__cold  sleeve_bore_lower  -1  0.199917...
lower_seat__sleeve_to_bearing__room  sleeve_bore_lower  -1  0.200000...
lower_seat__sleeve_to_bearing__hot   sleeve_bore_lower  -1  0.200107...
lower_seat__sleeve_to_bearing__hot__k0 sleeve_bore_lower -1  1.000535...
```

```
$ venv-win/Scripts/python.exe scripts/export_stack_tabular.py --stack hub_bearing_thermal_fit_m1 --out t.csv
$ (inspect t.csv's ELEMENTS block)
sleeve_bore_lower, 1, 0.999588, check:lower_seat__hub_to_sleeve__cold
```

The export shows `sign=+1` and names only the `hub_to_sleeve` check; the four
`sleeve_to_bearing` occurrences (sign `-1`, and a coefficient roughly a fifth
the magnitude) are silently absent from the row and from `term_context`. The
same collapsing loses real information for `hub_bore_lower` and
`sleeve_wall_lower` too — same sign but a coefficient that varies by stage/`k`
sensitivity, not just by temperature.

This matters more than an ordinary information loss because of what this repo's
own checklist says about exactly this archetype (check 2, "If the stack's
`checks` array is empty, the signs are not in the file... run
`debug_report_thermal_fit.py --terms` and read that table row by row" — because
a thermal_fit stack's JSON carries no terms at all). `thermal.py`'s own
`expanded_terms_table()` docstring: *"Generated checks are not readable in the
stack JSON... This puts them back on the page."* An exporter built to hand a
reviewer or Jeff a spreadsheet view of "every element's sign/coefficient" is,
for this exact archetype, doing the opposite: it manufactures the appearance of
one canonical sign per element where the real content is 7-16 check-scoped
occurrences, some with opposite sign. A reader auditing signs from this CSV
(the review checklist's own check 2, and plausibly Jeff's own use of a cert
export) would not know `sleeve_bore_lower` flips sign between stages at all.

This is not inline-fixable: it needs a different column model for a
multiply-referenced element (at minimum, one row per (element, term_context)
when occurrences disagree, or an explicit "MULTIPLE — see per-check
breakdown" marker instead of a single misleadingly-specific check id) and a
test against a generated-check archetype proving a sign disagreement is
surfaced rather than dropped. Send back for rework; the "checks-before-paths,
first-hit-wins" design needs to change for elements referenced by more than
one check.

### Blocker: suite is not green — a byte-identity claim in the new test file's docstring names no verification

```
FAILED tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification
```

`tests/test_export_stack_tabular.py`'s module docstring says *"A UTF-8 BOM...
and the pitch-link stack's own `±`/`⌀` callouts, byte for byte."* — a
byte-identity claim with no test name / sha256 / `git diff` named in the same
paragraph, which `test_every_byte_identity_claim_in_a_live_file_names_its_verification`
(the guard this repo built after five straight sightings of exactly this
class) now catches. This is a one-sentence fix (name
`test_written_csv_has_a_utf8_bom` and
`test_written_csv_preserves_plus_minus_and_diameter_characters` in the same
paragraph, or drop "byte for byte"), but the DoD requires a green suite and
it isn't, so it's part of this REQUEST CHANGES rather than something I fixed
inline — it ships with the same rework pass as the blocker above.

### Nit: `ARCHETYPE_LOADERS` duplicates archetype-dispatch knowledge already in `tolerance_stack/stack.py`/`thermal.py`

`export_stack_tabular.py` keeps its own one-line `{"thermal_fit":
load_thermal_fit_stack}` map rather than a shared dispatcher, with a comment
explaining the choice (avoid depending on the viewer-specific builder module).
Reasonable given the two-entry size today; flagging only so the next archetype
addition remembers this is a third place archetype dispatch is now hand-kept
(the other two: `build_viewer_projection.py`, and wherever `ARCHETYPE_thermal_fit.md`
enumerates archetypes). Not a blocker.

## Overlay

Added an **Architectural errors to check** entry for the "one row per element
loses cross-check sign disagreement" failure mode, since generated-check
archetypes are exactly where this repo's existing checklist already warns a
reviewer they must read term-by-term — any future *tool* that summarizes terms
needs the same warning applied to itself.

## Re-review, 2026-09-04 (fix commit `0aa7d54`)

Both blockers addressed. Verified rather than trusted:

- **Sign/coefficient collapsing.** `element_term_context()` (first-hit-wins) is
  replaced by `element_occurrences()` (collects every occurrence, checks first
  in file order then paths for anything no check reaches) +
  `group_occurrences()` (one row per **distinct** `(sign, coefficient)` pair).
  Re-ran both live examples by hand after merging the fix in:
  - `hub_bearing_thermal_fit_m1` — `sleeve_bore_lower` now exports **7 rows**,
    `sign=+1` for the three `hub_to_sleeve` temperatures and `sign=-1` for the
    four `sleeve_to_bearing` occurrences (three temperatures plus the `k0`
    sensitivity check), each with its own coefficient and `term_context`.
    Nothing is silently merged or dropped; occurrences that share the *same*
    weight (e.g. the `hot` stage-1 check and the `hot__k1` sensitivity check,
    which happen to compute an identical coefficient) are correctly joined
    into one row with both check ids in `term_context`, which is a real fact
    and not information loss.
  - `pitch_link_to_pitch_plate` — `bushing_214820`, `pitch_plate_flange` and
    `washer_nas1149v0332` (the `clamped_stack_sourced` path's members) now each
    export two rows, `sign=+1`/`check:shank_out__11_sourced_only` and
    `sign=-1`/`check:cotter_hole_clear_of_sourced_stack`, matching the JSON
    exactly (`shank_out__11_sourced_only` references the path with the
    default sign; `cotter_hole_clear_of_sourced_stack` references it with
    `"sign": -1`).
  New tests pin both examples directly
  (`test_element_referenced_by_two_checks_with_opposite_signs_gets_two_rows`,
  `test_thermal_fit_element_with_stage_dependent_sign_gets_multiple_rows`),
  not just the grouping mechanism in the abstract, and the CSV-block/no-
  duplicate-row tests were updated to allow (not require) more than one row
  per element. The lesson honestly records that the first version's "no
  seeded stack does this" claim was false and how review caught it.
- **Suite green.** The docstring now names
  `test_written_csv_has_a_utf8_bom` and
  `test_written_csv_preserves_plus_minus_and_diameter_characters` directly
  instead of asserting an unattributed "byte for byte". Full suite: **597
  passed, 1 skipped** (worktree; the one skip is the same pre-existing
  `data/`-dependent test every review in this repo reports skipped here).

No new issues found in the fix itself. The overlay entry added on the first
pass stands as written — it documents the failure mode, not the (now fixed)
instance of it.

## Verdict

**APPROVE.** Merging `handoff/stack_export_tabular` into `integration`,
re-running the suite there, and pushing.
