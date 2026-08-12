---
priority: med
depends_on: []
---

# HANDOFF 2026-08-12 — hardware_counts_doc_guard: a live doc still says eight entries transcribe the workbook; it has been five since 2026-08-10

Source: `docs/issues/ISSUE_20260811_the_values_source_counts_in_two_live_docs_are_stale.md`,
filed by `sop_library_ref_pairing` (2026-08-11). Baseline: trunk with
`fastener_citations_and_confidence` and `sop_library_ref_pairing` merged. Scope:
`docs/tolerance_stacks/README.md` and the doc-scan test in `tests/`. Do **NOT**
edit `docs/prompts/REVIEW_AGENT.md` — its copy of this count was already fixed
(see below) — and do not touch `apps/viewer/` or `tolerance_stack/spec_library.py`,
owned by three parallel handoffs.

## Half of this is already done — do not redo it

`fastener_citations_and_confidence` (2026-08-10) re-sourced `NAS6403U13H`,
`NAS6403U14D` and `NAS6404U13D` from `kind: "workbook"` to `kind: "spec"`, and
corrected `hardware_entries.json`'s own `description`, which
`test_hardware_entry_values_source_counts_match_the_description` pins against the
file.

`docs/prompts/REVIEW_AGENT.md:348` was then corrected during
`review/sop_library_ref_pairing` **by option 2** — it no longer states a share at
all, it points at that test and says to recount there. That was right and it is
done.

**`docs/tolerance_stacks/README.md:128` is untouched, and it is this handoff's
job.** It currently reads:

> "**Eight of the eleven inline entries** say `kind: "workbook"`… The other three
> are safe — one traced to the NAS6403 standard, two to their own source-control
> drawings"

## The true numbers, recounted by triage on 2026-08-12

Recounted directly from `docs/tolerance_stacks/hardware_entries.json` — not
quoted from the issue — as `{(values_status, values_source.kind): count}`, which
is exactly what the test computes:

| `values_status` / `kind` | count |
|---|---|
| `inline` / `workbook` | **5** |
| `inline` / `spec` | 3 |
| `inline` / `drawing` | 2 |
| `library` / `spec` | 1 |
| `not_transcribed` / (null) | 4 |
| **total** | **15** |

So of the **11** entries carrying a `values_source`: **five** say `workbook`, and
the other **six** are safe — **four** traced to the NAS standard (3 `inline` +
1 `library`), **two** to source-control drawings. Every number in the README
sentence is wrong, including "three" and "one".

Note the denominators differ by design and don't "fix" that: the JSON's own
`description` says "five of the fifteen", counting all entries; the README
sentence counts only the eleven with a source. Both are legitimate; state clearly
which you mean.

## Do option 2, not option 1

Option 1 (just correct the sentence) is cheap and leaves three copies of one
count in three files, which is how this recurred in the first place.

**The observation that settles it:** the README paragraph *already ends* by
telling the reader *"Do not quote those counts from here: a test asserts them
against the file… because this very sentence had already gone stale once."* The
warning was written, the count went stale anyway, and **the test it points at
guards a different file's copy of the number.** A prose warning is not a guard.

This is the repo's named recurring class — stale inventory numbers in prose — and
option 2 has direct precedent that worked: the traced ratio is quoted in several
live docs and `test_every_document_quoting_the_traced_ratio_quotes_the_current_number`
now fails when any of them goes stale.

## Deliverables

1. **Make `docs/tolerance_stacks/README.md:128` stop holding its own copy of the
   count** — either point at `hardware_entries.json`'s tested `description` / at
   `test_hardware_entry_values_source_counts_match_the_description` and say to
   recount there, or keep the numbers *and* bring them under a test (deliverable
   2). Do not leave a corrected-but-unguarded sentence; that is option 1 wearing
   option 2's clothes.
2. **Extend the doc-level scan pattern** already used by
   `test_every_document_quoting_the_traced_ratio_quotes_the_current_number` to
   these counts, so a stale copy fails the suite **wherever it lives** — that is
   the deliverable that stops the fourth recurrence, not the second.
3. **Sweep for other live copies of these counts** while you have the pattern in
   hand, and list what you found in the lesson — including "none", which is a
   real result. Two copies were known; nobody has looked for a third.

## Definition of done

- No live doc states a workbook/spec/drawing count that a test does not guard.
- Deliberately break `hardware_entries.json`'s counts in a scratch copy and show
  the new test failing and naming the offending document. A guard that has never
  been seen to fail is not yet a guard.
- Full suite green against the real tree.
- Lesson (`docs/sessions/lessons/LESSONS_20260812_hardware_counts_doc_guard.md`):
  the deliverable-3 sweep result, and the sharper point for the next author —
  the paragraph that went stale was the one carrying the warning about going
  stale.
