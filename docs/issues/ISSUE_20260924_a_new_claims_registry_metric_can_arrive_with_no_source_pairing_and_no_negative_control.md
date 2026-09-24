---
type: bug
priority: med
status: open
area: tests/doc-scans
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260924_claims_registry_guards_read_declarations_not_prose.md
---

# A seventh `METRICS` row can arrive with no source pairing and no negative control, and nothing in the suite notices

`tests/claims_registry.py`'s `METRICS` is the registry that keeps a declaration
from being decorative. Two of the three guards that are supposed to keep the
registry itself honest can be escaped by a new row without any test going red:

1. **`test_every_metric_names_a_source_that_exists` iterates
   `metric.source_paths`, and three of today's six metrics pass it
   vacuously.** `byte_identity`, `mesh_routes` and `smallest_chain` all carry
   `source_paths=()`, so the loop contributes nothing for them. Two of the
   three have a defensible reason (their source is under gitignored `data/`, or
   is the claim's own two targets), but the test never asserts the tuple is
   non-empty *or* deliberately empty — so a new metric whose source **is** a
   tracked path, added with `source_paths=()`, gets the same silent pass. The
   docstring's promise ("a source that is renamed away cannot leave the
   sentence behind") then holds for half the registry.
2. **`WRONG_ON_PURPOSE` in `tests/test_claims_registry.py` is a hand-kept
   tuple of four.** It is the definability bar the enrolling brief set — *a
   mutation of the guarded value reddens it* — and it covers four of six
   metrics with a written argument for the two it omits. Nothing derives it
   from `METRICS`, so a seventh metric arrives with no negative control and the
   suite is green: its `derive` could return `AGREES` unconditionally and only
   a reader would catch it.

Both are the shape this repo's own review checklist calls "a count, enum,
registry or fixture restated by hand instead of derived, with nothing pairing
the copy to its source", one level up from the documents the registry guards.
Ask the question the checklist asks: *if someone adds a metric tomorrow, what
breaks loudly?* Today, nothing.

Suggested shape (one test, not two): parametrize over `METRICS` and require
each row to be in exactly one of two states — a reachable source, in which case
`source_paths` is non-empty and every path exists **and** a `WRONG_ON_PURPOSE`
entry exists for it; or an explicitly-registered exception with its reason,
which puts the argument the two `data/`-backed metrics already have in writing
where a new row has to answer it.

Found reviewing `claims_registry_guards_read_declarations_not_prose`; the
registry itself is a clear improvement on the prose scans it replaced, and this
is about the registry's own arrival rate rather than about any value it checks
today (all 33 declarations agree with their sources as of 2026-09-24).
