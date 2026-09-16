---
type: feature
priority: med
status: triaged
area: spec_library
audience: strategy
reporter: agent
found_by: docs/sessions/active/HANDOFF_20260915_stack_fable_audit.md
strategy: docs/strategy/BRIEF_20260916_drawing_arrival_gap_join.md
---

# Nothing notices when a drawing a gap is waiting on lands in drawing-checker

The 2026-09-15 audit answered two operator-gated questions from drawings that
had been **sitting extracted in drawing-checker for weeks with nothing
noticing**:

- `212956-005-A` (run `20260904_184233`, eleven days old) — its parts list
  names both link eye bearings (MS14103-3 + MS14101-3), the exact fact the
  handoff queued an export request for.
- `215177-A` (run `20260813_180719`, a month old) — its parts list names
  NAS77A3-015A / NAS77A4-015A, closing the flanged-bushing identity that
  tan_link's elements carried as a wrong candidate (214936-002) the whole time.

This is the same defect class `spec_pile_gap_join` fixed for
`data/inbox/specs/` on 2026-08-13 ("nothing in the repo noticed that a new
document had made an existing gap closable"), one directory over:
`tests/debug_report_spec_pile_gaps.py` joins gaps against the spec pile but
not against **drawing-checker's runs/inbox**, where part drawings and
assembly extractions land. Gap texts name drawing numbers
(`213862-002`, `214943-002`, `214820-002`, ...) that a join could match
against run directories and inbox filenames the same range-aware way.

Needs design rather than a straight fix (hence `audience: strategy`): the
join crosses a repo boundary (read-only, main-checkout-only, like the
existing snapshot tooling), and the matching key is a drawing number embedded
in free gap prose — the spec-pile join solved the same shape for standards,
so the question is whether to extend that tool or grow a sibling.
