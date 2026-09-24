---
type: chore
priority: med
status: open
area: tests/doc-scans
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260924_claims_registry_guards_read_declarations_not_prose.md
---

# `tests/test_sop_vocabulary.py` is the last guard in the repo that still scans free prose for a claim, and it carries a third copy of the corpus scope logic

`claims_registry_guards_read_declarations_not_prose` (2026-09-23) moved every
guard in its deliverable list off prose and onto declared claims. One guard of
the same family was outside that list and is still there:
`tests/test_sop_vocabulary.py` carries its own `claims_in()` /
`claim_inventory()` — a regex scan for **superseded-nullness** claims
(`library_ref` is always null) over a `git ls-files` corpus, with its own
private copies of `_HISTORICAL` and `_SCANNED_SUFFIXES`.

Two costs, both the ones R3 was adopted to remove
(`dispatch/docs/reports/REPORT_20260921_bug_pareto.md`, pattern C2):

- **It can still redden a shared branch from a document nobody was editing.**
  That is how three of the fifteen C2 filings happened: `master` and
  `integration` went red before any handoff touched them, and ten of the
  fifteen were the same failure re-filed by sessions that could not see each
  other's issues.
- **Its scope constants are a third copy of logic `tests/claims_registry.py`
  now owns** (`CORPUS_SUFFIXES`, `HISTORICAL_PREFIXES`, `HISTORICAL_NAMES`,
  `is_claim_corpus`). A scope decision written twice drifts; this repo's
  `CLAUDE.md` names that as its most-repeated defect class.

The fact it guards is declarable with the machinery that already exists: the
`library` count is already a `hardware_entry_count` key, so the migration is a
declaration in whichever document states it plus a deletion here — the same
shape as the six guards that moved on 2026-09-23.

Named as deferred work in
`docs/sessions/lessons/LESSONS_20260923_claims_registry_guards_read_declarations_not_prose.md`,
"Out of scope and still reading prose". It had no issue because the handoff
fenced `docs/issues/` out of that session (a parallel session might have been
filing there), which is exactly the failure
`dispatch/docs/strategy/BRIEF_20260921_fenced_work_has_no_later.md` names; this
file is that lesson section given an owner.
