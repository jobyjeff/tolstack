---
priority: high
depends_on: []
---

# HANDOFF 2026-08-13 — check_completeness_schema: INCOMPLETE stops being a magic string

Source: `docs/strategy/BRIEF_20260806_check_completeness_schema.md`, expanded
2026-08-13 (design decisions below are settled). Baseline: trunk —
`viewer_generated_checks` merged 08-06, so the generated-checks path the
brief warned about racing is now stable ground to build on. Scope: the stack
schema/dataclasses (`tolerance_stack/`), `scripts/build_viewer_projection.py`,
`apps/viewer/`, SOP text, tests; do NOT touch the staged
`js_python_vocabulary_pairing` / `material_cte_optional` /
`traced_ratio_guard_freshness` handoffs' deliverables.

## Decisions (settled — build to these)

1. **Two new schema fields, no change to `verdict`'s domain:**
   - `complete: bool` (default true) on the check spec / `check_result`.
   - `excluded_terms: [str]` — **free strings, deliberately**: an excluded
     term is by definition a thing that has *no element* (it was never
     sourced — the pitch-link eye case), so an element reference cannot name
     it. The brief's crux question is answered by accepting that; the string
     should name the missing quantity and why (`"pitch-link eye /
     spherical bearing width — no document"` is the exemplar).
   - `verdict_scope: "joint" | "budget"` as a **second field** derived, not
     authored: `budget` iff `complete` is false. `verdict`'s
     `pass|marginal|fail` domain is untouched — every existing consumer
     keeps working, and the fail-on-incomplete misreading is fixed at render
     time by scope, which is the honest semantics ("fail" on an incomplete
     check is true of the model and false of the hardware — the brief's own
     line; keep it in the SOP text).
2. **Validation is bidirectional:** `complete: false` with empty
   `excluded_terms` fails validation, and non-empty `excluded_terms` with
   `complete: true` fails validation. One invariant, tested.
3. **`is_incomplete`'s string search dies.** Deleted, not coexisting. The
   deliberately-pinned test
   (`test_incomplete_is_detected_from_authored_prose_not_a_schema_field`) is
   **replaced** by its schema-field counterpart (same misreading scenarios:
   lower-case "incomplete", "PARTIAL", "budget only" — all now render
   correctly because detection no longer reads prose).
4. **Extend in place, no v1 bump** — `check_result` is produced, not stored
   (verify this is still true before relying on it; if something now
   persists check_results, stop and reread the brief's Q2), and both fields
   have safe defaults. Generated checks (`thermal.load_thermal_fit_stack`)
   must be able to declare completeness through the same fields.
5. **Viewer**: the striped card keys off `verdict_scope == "budget"`; a
   budget-scope verdict renders its number WITH the excluded terms named
   beside it (a budget without its exclusions listed is the misreading
   again). The vocabulary lands in all three homes (SOP prose, dataclass,
   enforcing test) — the repo's checklist records a merge failure from
   landing in two.
6. **Migrate the live instances:** the pitch-link stack's two INCOMPLETE
   checks move to the schema fields; their labels lose the shouted
   `-- INCOMPLETE:` suffix (the schema now says it).

## Definition of done

- The pitch-link stack renders: striped budget-scope cards, excluded term
  visible on the card, no INCOMPLETE string anywhere in detection logic
  (`grep -ri incomplete` in code finds only the schema field + SOP).
- Value-level tests for: the bidirectional validation, the replaced
  misreading test, a generated (thermal) check declaring incompleteness,
  and viewer projection output carrying both fields.
- Full suite green.
- Lesson (`docs/sessions/lessons/LESSONS_20260813_check_completeness_schema.md`):
  consumer count for `verdict` you found (validates the no-domain-change
  call), and the SOP wording change.

Related issue to update on completion:
`docs/issues/ISSUE_20260805_check_result_has_no_complete_flag.md` →
`status: resolved`.
