---
type: chore
priority: med
status: triaged
area: scripts/mutation-witnesses
reporter: agent
handoff: docs/sessions/HANDOFF_20260921_mutation_witness_enrollment_backlog.md
found_by: docs/sessions/HANDOFF_20260918_visual_rules_nothing_checks.md
---

# The thirteen guards `visual_rules_nothing_checks` added have no mutation-witness entry, and the handoff that would have declared them has already landed

`visual_rules_nothing_checks` (2026-09-18) added four guards carrying thirteen
witnessable claims, and was explicitly told not to touch
`scripts/mutation_witnesses.json` — the parallel
`mutation_witness_enrollment_gaps` owned that file, so the instruction was to
**name the new guards in the lesson so the enrollment handoff can declare
them**. That was the right call at the time and it is now a dead end:
`mutation_witness_enrollment_gaps` reached `completed/` and merged into
`integration` while this branch was still open (`0b849fa`, `3f877a0` and
siblings). Its window has closed, so nothing is scheduled to read the list.

Hence this issue. **The entries are measured, not proposed** — each `find` was
verified to occur exactly once in its file, and each was planted in a
`git archive HEAD` scratch tree and observed reddening the named check.
`docs/sessions/lessons/LESSONS_20260918_visual_rules_nothing_checks.md` §4 is
the full table with the `expect_red` strings; the work here is transcribing it
into the table's schema and running `npm run test:mutations` over the result.

## What is new to declare

One new browser suite, so the `suite` values below resolve against the
`SUITES` registry: **`typography pass's visual rules (live stack view)`**.

| tier | suite | count | what they witness |
| --- | --- | --- | --- |
| browser | `typography pass's visual rules (live stack view)` | 6 | the confidence-token scope, `--measure`, the name-column floor, the source-note clamp, and the fill budget (two entries, one `expect_red`) |
| browser | `crop lightbox (launch, zoom, pan on the live crops)` | 2 | the clamp wiring line, the un-scaled highlight edge |
| browser | `real render path (non-mock)` | 2 | the lightbox opening modal on `file://`, and the page's scroll being suppressed there |
| fast | — | 1 | the lightbox frame being sized to the fit |
| python | `tests/test_app_type_scale.py` | 2 | a `conf--` rule naming its element; each app declaring a base size |

Two things to know while transcribing, both recorded in the lesson:

* `crop-trigger-is-not-filled` and `attention-flag-is-not-filled` redden the
  **same** sub-check — the fill census, which is one assertion covering every
  mark on the page. Two entries, one `expect_red`, and that is correct rather
  than a copy-paste slip.
* `lightbox-opens-modal-on-file-origin` reddens **two** sub-checks, because
  `showModal()` → `show()` also leaves Escape without a dismiss. Name the
  modal one.
* One mutation appears twice on purpose — the `.chip.conf--untraced` scope
  drop is both a `browser` entry and a `python` entry, asking two different
  questions of the same edit (*did the row's cells inherit the chip's white?*
  versus *may a rule name a confidence token with nothing to scope it?*).

## Why `med` rather than `low`

Not for these thirteen, which are green today and were watched reddening by
hand this week. It is that this is the **third** time the same gap has been
filed —
`ISSUE_20260916_the_crop_lightboxs_new_guards_carry_no_mutation_witnesses`,
`ISSUE_20260916_the_reader_facing_copy_guards_have_no_mutation_witness_entry`
and now this one — and the second time it has happened *because the handoff
that would have declared them had already closed*. That is exactly the
structural finding `BRIEF_20260915_mutation_witness_enrollment.md` exists to
answer ("the tier exists, and joining it is nobody's job"), and each repetition
is another data point for it. The lesson's §2 carries this session's argument
about what key would actually close it.
