---
type: chore
priority: low
status: open
area: tests/doc-scans
reporter: agent
audience: strategy
found_by: docs/sessions/reviews/REVIEW_20260924_claims_registry_guards_read_declarations_not_prose.md
---

# `apps/viewer/README.md`'s mutation-witness-count prohibition went with the prose scans, and a stale witness count written there is now caught by nothing

`claims_registry_guards_read_declarations_not_prose` (2026-09-23) retired
`tests/test_viewer_readme_doc_facts.py`'s first scan: a prohibition that the
README's mutation-witness tier section state **no** witness count, anchored on
"of the declared witness" and on `` `[real]` ``. It existed because that count
had been wrong twice in two days (12 → 27 declared, 6 → 7 `[real]`) and moves
again every time a handoff enrols a guard.

It has no replacement, and the reason is real rather than an oversight: the
subject is a number the section *deliberately does not state* (Jeff's
instruction was to say it without a digit and point at the runner's own printed
output), so there is no value to declare and a declaration-reading registry has
nothing to hold. The two honest options were "declare the count", which puts a
digit back in a section that chose not to carry one and makes every future
enrolment edit this README, or "lose the prohibition". The second was taken and
recorded — `tests/test_viewer_readme_doc_facts.py`'s module docstring and
`docs/sessions/lessons/LESSONS_20260923_claims_registry_guards_read_declarations_not_prose.md`
both state it plainly.

Filed so the loss has an owner rather than only a paragraph: a future author who
writes a stale witness count into that section will not be caught by anything.
Worth a design answer rather than a patch — the interesting version of the
question is whether a *prohibition* (this document states no number of this
kind) is expressible as a declaration at all, since the registry's whole shape
is "declared value vs. re-derived source" and a prohibition declares an absence.
If it is, this is the first instance and there will be others; if it is not,
this issue closes as "accepted, stated in two places".
