---
type: bug
priority: med
status: open
area: docs / provenance accounting
reporter: agent
---

# Two live docs still say eight hardware entries transcribe the workbook; it has been five since 2026-08-10

Found during `sop_library_ref_pairing` (2026-08-11) while rewriting the
`library_ref` prose in the same paragraphs. Out of scope for that handoff — the
handoff's own coordination section says to resist tidying
`fastener_citations_and_confidence`'s prose — so filed, not fixed.

`fastener_citations_and_confidence` (2026-08-10) re-sourced `NAS6403U13H`,
`NAS6403U14D` and `NAS6404U13D` from `kind: "workbook"` to `kind: "spec"`, and
corrected the counts in `hardware_entries.json`'s own `description`, which
`test_hardware_entry_values_source_counts_match_the_description` pins against the
file. Two *other* live documents hold their own uncorrected copies of the same
numbers, and no test reads either:

| file | line | says | true value |
|---|---|---|---|
| `docs/tolerance_stacks/README.md` | 128 | "**Eight of the eleven inline entries** say `kind: "workbook"`… The other three are safe — one traced to the NAS6403 standard, two to their own source-control drawings" | **five** of the eleven; the other **six** are safe — **four** NAS bolts traced to the standard, two to source-control drawings |
| `docs/prompts/REVIEW_AGENT.md` | 348 | "**Eight of the nine inline entries** are workbook transcriptions, so this is the common case" | five of eleven — no longer a majority, so the *argument* in that sentence weakens too |

Recount, don't read: the numbers are
`{(values_status, values_source.kind): count}` over
`docs/tolerance_stacks/hardware_entries.json`, which is exactly what
`test_hardware_entry_values_source_counts_match_the_description` computes.

## Why it is worth an issue rather than a shrug

This is the repo's named recurring class (**stale inventory numbers in prose**),
and the interesting part is *where* it recurred: the paragraph in
`docs/tolerance_stacks/README.md` ends with *"Do not quote those counts from here:
a test asserts them against the file… because this very sentence had already gone
stale once."* The warning was written, the count went stale anyway, and the test it
points at guards a **different file's** copy of the number.

## Fix

Two options, and the second is the one worth the effort:

1. Correct both sentences. Cheap; leaves three copies of one count in three files.
2. Have the two live docs stop stating the count at all — point at
   `hardware_entries.json`'s `description` (which is tested) or at
   `test_hardware_entry_values_source_counts_match_the_description` — or extend the
   doc-level scan pattern already used by
   `test_every_document_quoting_the_traced_ratio_quotes_the_current_number` to
   these counts, so a stale copy fails the suite wherever it lives.

The traced ratio has precedent for option 2 and it worked: the ratio is quoted in
several live docs and a test now fails when any of them goes stale.

## Half done, 2026-08-11 (`review/sop_library_ref_pairing`)

`docs/prompts/REVIEW_AGENT.md:348` is the review overlay, which the review agent
owns and rewrites every review — a checklist stating a false count misleads the
next reviewer directly — so that sentence was corrected in this review by
**option 2**: it no longer states a share at all, it points at
`test_hardware_entry_values_source_counts_match_the_description` and says to
recount there. The wording it replaced is recorded above and in
`docs/sessions/reviews/REVIEW_20260811_sop_library_ref_pairing.md`.

**`docs/tolerance_stacks/README.md:128` is untouched and this issue stays open
for it** — that paragraph is `fastener_citations_and_confidence`'s prose. Option 2
applies there too, and the observation that makes it worth doing is unchanged: the
paragraph already ends by telling the reader not to quote counts from it, and the
test it points at guards a different file's copy of the number.
