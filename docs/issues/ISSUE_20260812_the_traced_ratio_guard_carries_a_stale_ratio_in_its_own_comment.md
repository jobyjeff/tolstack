---
type: chore
priority: low
status: resolved
area: tests / traced ratio
reporter: agent
handoff: docs/sessions/HANDOFF_20260812_traced_ratio_guard_freshness.md
---

# The traced-ratio guard states a stale ratio in its own comment

`tests/test_tolerance_stack.py`, inside
`test_every_document_quoting_the_traced_ratio_quotes_the_current_number`:

```python
current = f"{c['traced']} of {c['instances']}"          # "3 of 26"
superseded = "of 17"
```

`_counts()` over the seeded stacks has returned `traced: 5` since 2026-08-10
(`fastener_citations_and_confidence`; the sibling
`test_the_seeded_traced_ratio_is_the_number_every_document_quotes` asserts
`traced == 5` twelve lines above). So `current` evaluates to `"5 of 26"` and the
comment beside it says `"3 of 26"`.

Nothing is broken — the value is computed, not hard-coded, which is exactly why
the test still passes and why this is a chore rather than a bug. It is worth
fixing anyway because of *where* it is: a stale number in prose, sitting in the
guard this repo built against stale numbers in prose, is the line a future
author will read to learn the convention.

Found by `hardware_counts_doc_guard` (2026-08-12) while extending the same
doc-scan pattern to the `hardware_entry` counts; not fixed inline because the
traced ratio was outside that handoff's scope.

Two ways to close it, and the second is probably the point:

1. Correct the comment to `# "5 of 26"`.
2. Delete the comment. It is a cached copy of a value the line next to it
   computes, which is the whole failure mode. Sibling comments in the same
   region (`# the three bolts re-sourced 2026-08-10`) explain *why* a number is
   what it is and do not restate it; this one only restates it.

Adjacent, same visit: `superseded = "of 17"` catches only the first superseded
figure. `LESSONS_20260810_fastener_citations_and_confidence.md:213` already
flagged that `"3 of 26"` is now superseded too and is not in that list, and
noted the tension — a doc legitimately quoting the old figure in a dated
correction needs it outside a blockquote sometimes. The `hardware_entry` scan
added on 2026-08-12 solves that differently (a number inside a blockquote **or a
double-quoted phrase** is treated as a quotation, not a claim); if this one is
picked up, that exemption is reusable.

---

**Resolved 2026-08-17** (`traced_ratio_guard_freshness`). Option 2 on the
comment: it is gone, and the line it annotated now calls
`_current_traced_ratio()`, which recomputes the figure and says in its docstring
why no literal belongs there. The adjacent half was the larger one: the single
`superseded` string is now `_RETIRED_TRACED_RATIOS`, holding both retired figures
with the handoff that retired each, and the exemption does route through
`_quoted_spans()` as this issue suggested. Generalising it found one live bare
claim — `docs/SOP_TOLERANCE_STACK.md:96`, *"took it from 3 of 26 to 5"* — whose
retired figure is now quoted rather than deleted. See
`docs/sessions/lessons/LESSONS_20260817_traced_ratio_guard_freshness.md`.
