---
priority: low
depends_on: []
---

# HANDOFF 2026-08-12 — traced_ratio_guard_freshness: the stale-number guard states a stale number, and its superseded list has one entry too few

Source: triage sweep 2026-08-12, routing
`docs/issues/ISSUE_20260812_the_traced_ratio_guard_carries_a_stale_ratio_in_its_own_comment.md`
(`chore`, `low`). Found by `hardware_counts_doc_guard` while extending the same
doc-scan pattern to the `hardware_entry` counts; not fixed inline because the
traced ratio was outside that handoff's scope. Baseline: trunk, 2026-08-12.
Scope: `tests/test_tolerance_stack.py` only. Do **not** touch
`tolerance_stack/thermal.py` (owned by `material_cte_optional`) or
`tests/test_sop_vocabulary.py` (owned by `js_python_vocabulary_pairing`).

## Deliverable 1 — the comment (trivial, and it is not the point)

`tests/test_tolerance_stack.py:1071-1072`, inside
`test_every_document_quoting_the_traced_ratio_quotes_the_current_number`:

```python
current = f"{c['traced']} of {c['instances']}"          # "3 of 26"
superseded = "of 17"
```

`_counts()` over the seeded stacks has returned `traced: 5` since 2026-08-10
(`fastener_citations_and_confidence`); the sibling
`test_the_seeded_traced_ratio_is_the_number_every_document_quotes` asserts
`traced == 5` twelve lines above, at line 1006. So `current` evaluates to
`"5 of 26"` and the comment beside it says `"3 of 26"`.

Nothing is broken — the value is computed, not hard-coded, which is exactly why
the test still passes and why this is a `chore`. **Delete the comment rather than
correcting it.** It is a cached copy of a value the line next to it computes,
which is the entire failure mode this guard exists against; sibling comments in
the same region (`# the three bolts re-sourced 2026-08-10`) explain *why* a
number is what it is and do not restate it. If you prefer to correct it to
`# "5 of 26"`, you are choosing to re-arm the thing that just went off — argue
that in the lesson or don't do it.

## Deliverable 2 — the superseded list, which is the actual gap

`superseded = "of 17"` catches only the **first** superseded figure. The ratio
has moved twice:

| figure | live from | superseded by |
|---|---|---|
| `1 of 17` | 2026-07-29 | `traced_labels_and_ratio`, 2026-08-06 |
| `3 of 26` | 2026-08-06 | `fastener_citations_and_confidence`, 2026-08-10 |
| `5 of 26` | 2026-08-10 | current |

`LESSONS_20260810_fastener_citations_and_confidence.md:213` already flagged that
`"3 of 26"` is superseded and absent from that list, and named the tension that
stopped it being added: a document legitimately quoting an old figure in a dated
correction needs the old number to survive, and this repo's convention is to
leave it visible rather than overwrite it.

**That tension is already solved, in this same file, by the sibling scan added
2026-08-12.** `_quoted_spans()` (line ~1294) treats a number as a *quotation
rather than a claim* when it sits inside a markdown blockquote line **or** inside
a double-quoted phrase — the latter added because JSON gives you no blockquote,
for the correction in `NAS6403U11D`'s `library_ref_note`. `hardware_entry_count_claims()`
(line ~1308) shows the usage: collect `_quoted_spans(text)` once, skip any match
whose start offset falls inside one.

So: **generalise `superseded` to the full list of retired figures and route the
exemption through `_quoted_spans()`** instead of the current
`not line.lstrip().startswith(">")` blockquote-only check at line 1082. The
inline-quotation half is the part the current check lacks, and it is the half
that made adding `"3 of 26"` look unsafe.

## Definition of done

- The guard is **demonstrated failing on the newly-covered figure**: add
  `3 of 26` as a bare claim to a live doc, show the test goes red naming the file
  and line, remove it. Then add the same figure inside a blockquote *and* inside
  a double-quoted phrase, and show it passes both times. Three probes, because
  the whole change is about telling a claim from a quotation. This repo's
  universal check (`has this guard been seen to fail?`) applies directly — the
  handoff exists because a guard's own comment went stale unnoticed.
- `grep -n '"3 of 26"\|"1 of 17"' ` across live docs returns only quotations, or
  nothing.
- Full suite green; state which checkout produced the count (the
  `hardware_counts_doc_guard` review's N1 finding was a suite line that didn't
  say which).
- Lesson (`docs/sessions/lessons/LESSONS_20260812_traced_ratio_guard_freshness.md`):
  whether `_quoted_spans()` could be shared between the two scans outright rather
  than called by both — and if you left them separate, why. Two doc-scanning
  guards in one file with two different notions of "quoted" is the next version
  of this bug.
