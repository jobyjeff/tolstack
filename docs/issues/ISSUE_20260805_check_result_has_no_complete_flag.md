---
type: feature
priority: med
status: resolved
area: schema / tolerance_stack
reporter: agent
strategy: docs/strategy/BRIEF_20260806_check_completeness_schema.md
resolved_by: docs/sessions/HANDOFF_20260813_check_completeness_schema.md
resolved_on: 2026-08-13
---

> **RESOLVED 2026-08-13** by handoff `check_completeness_schema`, as suggested
> below and with one addition the brief settled: `verdict_scope` is a **second
> field** (`joint` | `budget`, derived from `complete`), not a change to
> `verdict`'s domain — so no consumer of `pass|marginal|fail` had to learn a new
> value. `excluded_terms` are **free strings**, deliberately: an excluded term
> has no element to reference, because never being sourced is why it is
> excluded. Validation is bidirectional, `is_incomplete` is deleted rather than
> kept alongside, the pitch-link stack's two checks are migrated off the shouted
> label suffix, and the pinned lower-case-miss test is replaced by its
> schema-field counterpart. See
> `docs/sessions/lessons/LESSONS_20260813_check_completeness_schema.md`.

# `check_result/v0` has no `complete` flag, so "INCOMPLETE" rides on prose

A check whose term list is knowingly missing a member — the pitch-link stack's
two, which exclude the unsourced link-eye width — is the single most important
thing a reviewer must not misread: its verdict is a **budget for the missing
term**, not a conclusion about the joint. Today that fact exists only in the
authored English:

```json
"label": "shank out, NAS6403U11D -- INCOMPLETE: pitch-link eye width unsourced",
"configuration": { "excluded": "pitch-link eye / spherical bearing width -- no document" }
```

`scripts/build_viewer_projection.py::is_incomplete` therefore detects it by
searching `label` + `guidance` + `check_id` for the literal string
`INCOMPLETE`, and `apps/viewer/` renders the striped card off that. Consequences:

- a stack that writes "incomplete" in lower case, or "PARTIAL", or "budget only",
  renders as a **normal check with a fail verdict** — the exact misreading the
  flag exists to prevent;
- nothing validates that a check claiming INCOMPLETE also names what is
  excluded, or vice versa.

`configuration.excluded` is the closer thing to structured (the viewer's gap list
is built from it, and it is how gap 1 reaches the screen), but it is a free-text
value in a free-text dict, and a check can carry `excluded` without saying
INCOMPLETE.

## Suggested fix

Add to `check_result/v0` / the check spec in a stack definition:

```json
"complete": false,
"excluded_terms": ["pitch-link eye / spherical bearing width -- no document"]
```

`CheckResult.verdict` should probably also refuse to read as a bare
`pass|marginal|fail` when `complete` is false — e.g. a `verdict_scope` of
`joint` vs `budget` — since "fail" on an incomplete check is currently true of
the model and false of the hardware. Then:

- the SOP's INCOMPLETE convention becomes a schema requirement with a test;
- `is_incomplete`'s string search in `build_viewer_projection.py` is deleted;
- a check with `complete: false` and no `excluded_terms` fails validation.

Found while building the viewer (handoff `stack_viewer_v0`, 2026-08-05). The
heuristic is documented in `is_incomplete`'s docstring and pinned by
`tests/test_viewer_projection.py::test_incomplete_is_detected_from_authored_prose_not_a_schema_field`,
which asserts the lower-case miss on purpose so the gap cannot be forgotten.
