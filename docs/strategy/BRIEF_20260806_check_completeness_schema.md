# STRATEGY BRIEF 2026-08-06 — completeness as a schema field, not as prose

> **EXPANDED 2026-08-13 (strategy session) — consumed.** Decisions:
> `complete: bool` + `excluded_terms` (free strings — an excluded term has
> no element by definition) + derived `verdict_scope: joint|budget` as a
> second field (verdict's domain untouched); bidirectional validation;
> string search deleted; extend in place (check_result is produced, not
> stored). Staged:
> `docs/sessions/HANDOFF_20260813_check_completeness_schema.md`.

Routed by the 2026-08-06 triage sweep from
`docs/issues/ISSUE_20260805_check_result_has_no_complete_flag.md`
(`type: feature`, `priority: med`, filed by `stack_viewer_v0` on 2026-08-05).

**This is a brief, not a design.** Triage does not design features. What follows
is the problem, the evidence, the constraints a design has to respect, and the
questions a strategy agent should answer before decomposing it into handoffs.

## The problem

A check whose term list is knowingly missing a member — the pitch-link stack's
two, which exclude the unsourced link-eye width — is **the single most important
thing a reviewer must not misread**: its verdict is a *budget for the missing
term*, not a conclusion about the joint. Today that fact exists only in authored
English:

```json
"label": "shank out, NAS6403U11D -- INCOMPLETE: pitch-link eye width unsourced",
"configuration": { "excluded": "pitch-link eye / spherical bearing width -- no document" }
```

`scripts/build_viewer_projection.py::is_incomplete` detects it by searching
`label` + `guidance` + `check_id` for the literal string `INCOMPLETE`, and
`apps/viewer/` renders the striped card off that. Consequences:

- a stack that writes "incomplete" in lower case, or "PARTIAL", or "budget only",
  renders as a **normal check with a fail verdict** — the exact misreading the
  flag exists to prevent;
- nothing validates that a check claiming INCOMPLETE also names what is excluded,
  or vice versa.

`configuration.excluded` is the closer thing to structured — the viewer's gap
list is built from it — but it is a free-text value in a free-text dict, and a
check can carry `excluded` without saying INCOMPLETE.

The gap is deliberately pinned:
`tests/test_viewer_projection.py::test_incomplete_is_detected_from_authored_prose_not_a_schema_field`
asserts the lower-case miss **on purpose**, so it cannot be forgotten. Whatever
ships must replace that test, not delete it.

## The reporter's suggested shape (a starting point, not a decision)

Add to `check_result/v0` / the check spec in a stack definition:

```json
"complete": false,
"excluded_terms": ["pitch-link eye / spherical bearing width -- no document"]
```

and — the more interesting half — `CheckResult.verdict` should probably refuse to
read as a bare `pass|marginal|fail` when `complete` is false: e.g. a
`verdict_scope` of `joint` vs `budget`, **since "fail" on an incomplete check is
currently true of the model and false of the hardware.** Then the SOP's
INCOMPLETE convention becomes a schema requirement with a test, `is_incomplete`'s
string search is deleted, and a check with `complete: false` and no
`excluded_terms` fails validation.

## Questions a design has to answer

1. **Is `verdict_scope` a second field or a change to `verdict`'s domain?** The
   second is more honest and more disruptive: every consumer that switches on
   `pass|marginal|fail` has to learn a new value. Count the consumers first.
2. **Is `check_result/v0` versioned to `v1`, or extended in place?** The repo's
   convention for versioned schemas, and what re-derivation of existing stacks a
   bump would force, decides this. `check_result` is **produced, not stored**,
   which materially lowers the cost — confirm that is still true.
3. **What are `excluded_terms` — free strings, or references into the element
   set?** A string repeats the free-text problem one level down. An element
   reference is stronger but cannot name a term that has no element *because it
   was never sourced*, which is precisely the pitch-link case. This is the
   crux; a design that hand-waves it has not solved the problem.
4. **What does the viewer do differently?** The striped card exists; the question
   is whether a `budget`-scope verdict should render its number at all, or
   render it with the excluded term named beside it.
5. **Does this interact with the archetypes?** `thermal_fit` generates its checks
   in Python (`thermal.load_thermal_fit_stack`). A generated check must be able
   to declare completeness too, and the staged handoff
   `viewer_generated_checks` is actively changing how generated checks reach the
   viewer. Sequence against it — do not design in parallel and collide.

## Constraints

- **`is_incomplete`'s string search must die, not coexist.** Two detectors is
  worse than one bad detector; the checklist's "a corroboration flag shown
  without the evidence that produced it" item is the same family.
- **A vocabulary lives in three places here** — the SOP prose, the dataclass
  comment, and the enforcing test. Any new enum must land in all three; this
  repo's checklist records a merge failure caused by landing in two.
- The board is busy: five tactical handoffs staged in tolstack on 2026-08-06
  (`viewer_generated_checks`, `citation_export_provenance`,
  `traced_labels_and_ratio`, `readonly_invariant_evidence`,
  `gitignore_data_precedence`). Two of them touch the viewer projection and the
  stack schema. Decompose with `depends_on:` set accordingly rather than racing
  them.

## Not in scope for the design

Widening this into a general "data quality flags" schema. The issue is about one
specific, high-consequence misreading; solve that.
